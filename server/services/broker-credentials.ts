/**
 * Server-side broker credentials service.
 * All DB access uses the service-role client.
 * Raw credentials are NEVER returned — only masked values.
 */
import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  encryptCredentials,
  decryptCredentials,
  maskCredentialMap,
  isEncryptionAvailable,
} from "@/lib/security/broker-encryption";
import type {
  BrokerCredentialRow,
  SaveBrokerCredentialsPayload,
  UpdateBrokerCredentialsPayload,
  BrokerId,
} from "@/types/broker";

function rowToRecord(row: Record<string, unknown>): Omit<BrokerCredentialRow, "masked_credentials"> {
  return {
    id: row.id as string,
    broker_id: row.broker_id as BrokerId,
    label: row.label as string,
    is_active: row.is_active as boolean,
    is_connected: row.is_connected as boolean,
    last_tested_at: row.last_tested_at as string | null,
    last_test_result: row.last_test_result as string | null,
    environment: row.environment as string,
    created_by: row.created_by as string | null,
    updated_by: row.updated_by as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// -------------------------------------------------------
// READ
// -------------------------------------------------------

export async function getAllBrokerCredentials(): Promise<BrokerCredentialRow[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_credentials")
    .select(
      "id, broker_id, label, is_active, is_connected, last_tested_at, last_test_result, environment, created_by, updated_by, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    // Table doesn't exist yet (migration not run) — return empty array
    if (error.message?.includes("does not exist") || error.code === "42P01") {
      return [];
    }
    throw new Error(`Failed to fetch broker credentials: ${error.message}`);
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    ...rowToRecord(row),
    masked_credentials: {},
  }));
}

export async function getBrokerCredentialById(
  id: string
): Promise<BrokerCredentialRow | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_credentials")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  let maskedCredentials: Record<string, string> = {};

  try {
    const raw = await decryptCredentials(row.encrypted_credentials as string);
    maskedCredentials = maskCredentialMap(raw);
  } catch {
    maskedCredentials = {};
  }

  return {
    ...rowToRecord(row),
    masked_credentials: maskedCredentials,
  };
}

// -------------------------------------------------------
// CREATE
// -------------------------------------------------------

export async function createBrokerCredential(
  payload: SaveBrokerCredentialsPayload,
  employeeId: string
): Promise<BrokerCredentialRow> {
  // Check encryption — if not available, report clearly
  if (!isEncryptionAvailable()) {
    throw new Error(
      "BROKER_ENCRYPTION_KEY is not set. Add it to .env.local (min 16 chars) before storing broker credentials. " +
        "Example: BROKER_ENCRYPTION_KEY=my-secret-key-minimum-16-chars"
    );
  }

  const encrypted = await encryptCredentials(payload.credentials);
  const db = createServerSupabaseClient();

  const insertRow = {
    broker_id: payload.broker_id,
    label: payload.label ?? "Default",
    encrypted_credentials: encrypted,
    is_active: false,
    is_connected: false,
    environment: payload.environment ?? "production",
    created_by: employeeId,
    updated_by: employeeId,
  };

  const { data, error } = await db
    .from("broker_credentials")
    .insert(insertRow)
    .select(
      "id, broker_id, label, is_active, is_connected, last_tested_at, last_test_result, environment, created_by, updated_by, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    if (error?.message?.includes("does not exist") || error?.code === "42P01") {
      throw new Error(
        "The broker_credentials table does not exist yet. " +
          "Run database/broker_credentials_migration.sql against your Terminal Supabase #2 project."
      );
    }
    throw new Error(`Failed to save broker credentials: ${error?.message ?? "unknown error"}`);
  }

  const row = data as Record<string, unknown>;
  return {
    ...rowToRecord(row),
    masked_credentials: maskCredentialMap(payload.credentials),
  };
}

// -------------------------------------------------------
// UPDATE
// -------------------------------------------------------

export async function updateBrokerCredential(
  id: string,
  payload: UpdateBrokerCredentialsPayload,
  employeeId: string
): Promise<BrokerCredentialRow | null> {
  const updateData: Record<string, unknown> = {
    updated_by: employeeId,
    updated_at: new Date().toISOString(),
  };

  if (payload.label !== undefined) updateData.label = payload.label;
  if (payload.environment !== undefined) updateData.environment = payload.environment;

  if (payload.credentials && Object.keys(payload.credentials).length > 0) {
    if (!isEncryptionAvailable()) {
      throw new Error("BROKER_ENCRYPTION_KEY is not set. Cannot update credentials.");
    }
    updateData.encrypted_credentials = await encryptCredentials(payload.credentials);
    updateData.is_connected = false;
    updateData.last_tested_at = null;
    updateData.last_test_result = null;
  }

  const db = createServerSupabaseClient();
  const { error } = await db
    .from("broker_credentials")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(`Failed to update: ${error.message}`);

  return getBrokerCredentialById(id);
}

// -------------------------------------------------------
// DELETE
// -------------------------------------------------------

export async function deleteBrokerCredential(id: string): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db.from("broker_credentials").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete: ${error.message}`);
}

// -------------------------------------------------------
// SET ACTIVE
// -------------------------------------------------------

export async function setActiveBroker(id: string, employeeId: string): Promise<void> {
  const db = createServerSupabaseClient();
  const ts = new Date().toISOString();

  // Deactivate all first
  await db
    .from("broker_credentials")
    .update({ is_active: false, updated_by: employeeId, updated_at: ts });

  // Then activate selected
  await db
    .from("broker_credentials")
    .update({ is_active: true, updated_by: employeeId, updated_at: ts })
    .eq("id", id);
}

// -------------------------------------------------------
// DHAN CONNECTION TEST
// -------------------------------------------------------

export async function testDhanConnection(
  id: string
): Promise<{ success: boolean; message: string }> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_credentials")
    .select("encrypted_credentials, broker_id")
    .eq("id", id)
    .single();

  if (error || !data) return { success: false, message: "Credential record not found." };

  const row = data as { encrypted_credentials: string; broker_id: string };

  if (row.broker_id !== "dhan") {
    return {
      success: false,
      message: "Connection testing is only implemented for Dhan.",
    };
  }

  let credentials: Record<string, string>;
  try {
    credentials = await decryptCredentials(row.encrypted_credentials);
  } catch {
    return { success: false, message: "Failed to decrypt credentials." };
  }

  const clientId = credentials.client_id;
  const accessToken = credentials.access_token;

  if (!clientId || !accessToken) {
    return { success: false, message: "Client ID or Access Token is missing." };
  }

  if (process.env.DEV_MODE === "true") {
    return {
      success: false,
      message: "DEV MODE: Real connection test requires valid Dhan credentials.",
    };
  }

  try {
    const response = await fetch("https://api.dhan.co/v2/fundlimit", {
      method: "GET",
      headers: {
        "access-token": accessToken,
        "client-id": clientId,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    const ts = new Date().toISOString();

    if (response.ok) {
      await db.from("broker_credentials").update({
        is_connected: true,
        last_tested_at: ts,
        last_test_result: "Connection successful",
      }).eq("id", id);
      return { success: true, message: "Connection successful — Dhan API responded." };
    }

    const msg = `Dhan API returned ${response.status}: ${response.statusText}`;
    await db.from("broker_credentials").update({
      is_connected: false,
      last_tested_at: ts,
      last_test_result: msg,
    }).eq("id", id);
    return { success: false, message: msg };
  } catch (err) {
    const msg = err instanceof Error ? `Connection failed: ${err.message}` : "Connection failed";
    await db.from("broker_credentials").update({
      is_connected: false,
      last_tested_at: new Date().toISOString(),
      last_test_result: msg,
    }).eq("id", id);
    return { success: false, message: msg };
  }
}
