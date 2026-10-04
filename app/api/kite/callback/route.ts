/**
 * Kite OAuth Callback Route
 * 
 * Receives the request_token from Kite after successful authentication.
 * Exchanges the request_token for an access_token using the Kite API.
 * Stores the access_token in broker_connections table (encrypted).
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { encryptCredentials, isEncryptionAvailable } from "@/lib/security/broker-encryption";
import { serverLog } from "@/lib/logger";

const KITE_SESSION_URL = "https://api.kite.trade/session/token";

interface KiteSessionResponse {
  status: "success" | "error";
  data?: {
    access_token: string;
    user_type: string;
    email: string;
    user_name: string;
    user_shortname: string;
    broker: string;
    exchanges: string[];
    products: string[];
    order_types: string[];
    avatar_url: string | null;
    user_id: string;
    api_key: string;
  };
  message?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const searchParams = req.nextUrl.searchParams;
  const requestToken = searchParams.get("request_token");
  const status = searchParams.get("status");

  // Check for OAuth errors
  if (status !== "success") {
    serverLog("warn", "broker", "kite_oauth_denied", { status });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_TERMINAL_OS_URL || 'https://terminal-os.fundedwealth.com'}/broker-management/api-keys?error=kite_oauth_denied`
    );
  }

  if (!requestToken) {
    serverLog("error", "broker", "kite_oauth_missing_token", {});
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_TERMINAL_OS_URL || 'https://terminal-os.fundedwealth.com'}/broker-management/api-keys?error=kite_oauth_missing_token`
    );
  }

  // Load Kite API credentials from environment
  const apiKey = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;

  if (!apiKey || !apiSecret) {
    serverLog("error", "broker", "kite_credentials_not_configured", {});
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_TERMINAL_OS_URL || 'https://terminal-os.fundedwealth.com'}/broker-management/api-keys?error=kite_not_configured`
    );
  }

  // Exchange request_token for access_token
  try {
    // Generate checksum: SHA-256(api_key + request_token + api_secret)
    const checksum = crypto
      .createHash("sha256")
      .update(apiKey + requestToken + apiSecret)
      .digest("hex");

    // Call Kite session token endpoint
    const response = await fetch(KITE_SESSION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Kite-Version": "3",
      },
      body: new URLSearchParams({
        api_key: apiKey,
        request_token: requestToken,
        checksum: checksum,
      }),
    });

    const data: KiteSessionResponse = await response.json();

    if (!response.ok || data.status !== "success" || !data.data?.access_token) {
      serverLog("error", "broker", "kite_token_exchange_failed", {
        status: response.status,
        error: data.message || "Unknown error",
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_TERMINAL_OS_URL || 'https://terminal-os.fundedwealth.com'}/broker-management/api-keys?error=kite_token_exchange_failed`
      );
    }

    // Successfully obtained access_token
    const accessToken = data.data.access_token;
    const userName = data.data.user_name || data.data.user_id;

    // Check if encryption is available
    if (!isEncryptionAvailable()) {
      serverLog("error", "broker", "encryption_not_configured", {});
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_TERMINAL_OS_URL || 'https://terminal-os.fundedwealth.com'}/broker-management/api-keys?error=encryption_not_configured`
      );
    }

    // Encrypt the credentials
    const credentials = {
      api_key: apiKey,
      access_token: accessToken,
    };
    const encryptedCredentials = await encryptCredentials(credentials);

    // Store in broker_connections table
    const db = createServerSupabaseClient();
    
    // Check if a Kite connection already exists (update) or create new
    const { data: existing, error: queryError } = await db
      .from("broker_connections")
      .select("id")
      .eq("broker_id", "zerodha")
      .eq("environment", "production")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      serverLog("error", "broker", "kite_db_query_failed", { error: queryError.message });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_TERMINAL_OS_URL || 'https://terminal-os.fundedwealth.com'}/broker-management/api-keys?error=kite_db_error`
      );
    }

    const now = new Date().toISOString();

    if (existing) {
      // Update existing connection
      const { error: updateError } = await db
        .from("broker_connections")
        .update({
          encrypted_credentials: encryptedCredentials,
          is_connected: false,
          connection_status: "untested",
          last_tested_at: null,
          last_test_result: null,
          health_metadata: { oauth_completed_at: now, user_name: userName },
          updated_at: now,
        })
        .eq("id", existing.id);

      if (updateError) {
        serverLog("error", "broker", "kite_db_update_failed", { error: updateError.message });
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_TERMINAL_OS_URL || 'https://terminal-os.fundedwealth.com'}/broker-management/api-keys?error=kite_db_error`
        );
      }
    } else {
      // Create new connection
      const { error: insertError } = await db
        .from("broker_connections")
        .insert({
          broker_id: "zerodha",
          label: `Kite - ${userName}`,
          encrypted_credentials: encryptedCredentials,
          is_active: false,
          is_connected: false,
          connection_status: "untested",
          environment: "production",
          health_metadata: { oauth_completed_at: now, user_name: userName },
        });

      if (insertError) {
        serverLog("error", "broker", "kite_db_insert_failed", { error: insertError.message });
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_TERMINAL_OS_URL || 'https://terminal-os.fundedwealth.com'}/broker-management/api-keys?error=kite_db_error`
        );
      }
    }

    // Success - redirect to broker management page
    serverLog("info", "broker", "kite_oauth_success", { user_name: userName });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_TERMINAL_OS_URL || 'https://terminal-os.fundedwealth.com'}/broker-management/api-keys?success=kite_connected`
    );

  } catch (error) {
    serverLog("error", "broker", "kite_oauth_exception", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_TERMINAL_OS_URL || 'https://terminal-os.fundedwealth.com'}/broker-management/api-keys?error=kite_oauth_failed`
    );
  }
}
