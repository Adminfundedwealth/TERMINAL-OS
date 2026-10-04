/**
 * Kite OAuth Login Route
 * 
 * Initiates the Kite Connect OAuth flow by redirecting the user to Kite's login page.
 * After successful authentication, Kite redirects back to the callback URL with a request_token.
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";

const KITE_LOGIN_URL = "https://kite.trade/connect/login";

export const GET = withAuth(PERMISSIONS.BROKER_MANAGE, async () => {
  const apiKey = process.env.KITE_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json(
      { error: "Kite API Key is not configured on the server." },
      { status: 500 }
    );
  }

  // Build Kite OAuth URL
  const loginUrl = new URL(KITE_LOGIN_URL);
  loginUrl.searchParams.set("api_key", apiKey);
  loginUrl.searchParams.set("v", "3");

  // Redirect to Kite login
  return NextResponse.redirect(loginUrl.toString());
});
