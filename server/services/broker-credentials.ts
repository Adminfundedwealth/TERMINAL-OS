/** Server-side access to the canonical encrypted broker_credentials table. */
import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MarketDataProviderError } from "@/server/brokers/provider-error";
import { DhanMarketDataProvider } from "@/server/brokers/dhan";
import { KiteMarketDataProvider } from "@/server/brokers/kite";
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

const CREDENTIAL_COLUMNS = [
  "id",
  "trading_account_id",
  "broker_id",
  "label",
  "encrypted_credentials",
  "is_active",
  "is_connected",
  "last_tested_at",
  "last_test_result",
  "environment",
  "created_by",
  "updated_by",
  "created_at",
  "updated_at",
].join(", ");

type StoredBrokerCredential = {
  id: string;
  trading_account_id: string | null;
  broker_id: BrokerId;
  label: string;
  encrypted_credentials: string;
  is_active: boolean;
  is_connected: boolean;
  last_tested_at: string | null;
  last_test_result: string | null;
  environment: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

async function toCredentialRow(row: StoredBrokerCredential): Promise<BrokerCredentialRow> {
  let maskedCredentials: Record<string, string> = {};
  try {
    maskedCredentials = maskCredentialMap(await decryptCredentials(row.encrypted_credentials));
  } catch {
    // A masked summary remains safe to return if stored ciphertext is unreadable.
  }

  return {
    id: row.id,
    trading_account_id: row.trading_account_id,
    broker_id: row.broker_id,
    label: row.label,
    masked_credentials: maskedCredentials,
    is_active: row.is_active,
    is_connected: row.is_connected,
    last_tested_at: row.last_tested_at,
    last_test_result: row.last_test_result,
    environment: row.environment,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getAllBrokerCredentials(): Promise<BrokerCredentialRow[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_credentials")
    .select(CREDENTIAL_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Failed to fetch broker credentials.");
  return Promise.all(((data ?? []) as StoredBrokerCredential[]).map(toCredentialRow));
}

export async function getBrokerCredentialById(
  id: string
): Promise<BrokerCredentialRow | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_credentials")
    .select(CREDENTIAL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return toCredentialRow(data as StoredBrokerCredential);
}

async function getDecryptedCredential(id: string): Promise<{ row: StoredBrokerCredential; credentials: Record<string, string> } | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_credentials")
    .select(CREDENTIAL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as StoredBrokerCredential;
  try {
    return { row, credentials: await decryptCredentials(row.encrypted_credentials) };
  } catch {
    throw new MarketDataProviderError(row.broker_id === "zerodha" ? "kite" : "dhan", "CREDENTIAL_STORAGE_ERROR");
  }
}

export async function getMarketDataCredentials(
  tradingAccountId: string,
  provider: "dhan" | "kite",
  environment: "production" | "paper" | "sandbox" = "production"
): Promise<Record<string, string>> {
  if (!tradingAccountId) throw new MarketDataProviderError(provider, "INVALID_REQUEST");
  const brokerId = provider === "kite" ? "zerodha" : "dhan";
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_credentials")
    .select("encrypted_credentials")
    .eq("broker_id", brokerId)
    .eq("trading_account_id", tradingAccountId)
    .eq("environment", environment)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new MarketDataProviderError(provider, "CREDENTIAL_STORAGE_ERROR");
  if (!data?.encrypted_credentials) throw new MarketDataProviderError(provider, "MISSING_CREDENTIALS");
  try {
    return await decryptCredentials(data.encrypted_credentials);
  } catch {
    throw new MarketDataProviderError(provider, "CREDENTIAL_STORAGE_ERROR");
  }
}

export async function getMarketDataCredentialStatus(
  tradingAccountId: string,
  provider: "dhan" | "kite",
  environment: "production" | "paper" | "sandbox" = "production"
): Promise<{ configured: boolean; is_connected: boolean; last_tested_at: string | null; last_test_result: string | null }> {
  const brokerId = provider === "kite" ? "zerodha" : "dhan";
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_credentials")
    .select("is_connected, last_tested_at, last_test_result")
    .eq("trading_account_id", tradingAccountId)
    .eq("broker_id", brokerId)
    .eq("environment", environment)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new MarketDataProviderError(provider, "CREDENTIAL_STORAGE_ERROR");
  return {
    configured: Boolean(data),
    is_connected: data?.is_connected === true,
    last_tested_at: data?.last_tested_at ?? null,
    last_test_result: data?.is_connected
      ? "Authentication successful."
      : data?.last_tested_at
        ? "Authentication failed."
        : null,
  };
}

export async function recordMarketDataAuthentication(
  tradingAccountId: string,
  provider: "dhan" | "kite",
  environment: "production" | "paper" | "sandbox",
  authenticated: boolean,
  result: string
): Promise<void> {
  const brokerId = provider === "kite" ? "zerodha" : "dhan";
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_credentials")
    .update({
      is_connected: authenticated,
      last_tested_at: new Date().toISOString(),
      last_test_result: result,
    })
    .eq("trading_account_id", tradingAccountId)
    .eq("broker_id", brokerId)
    .eq("environment", environment)
    .eq("is_active", true)
    .select("id")
    .maybeSingle();
  if (error) throw new MarketDataProviderError(provider, "CREDENTIAL_STORAGE_ERROR");
  if (!data) throw new MarketDataProviderError(provider, "MISSING_CREDENTIALS");
}

export async function createBrokerCredential(
  payload: SaveBrokerCredentialsPayload,
  _employeeId: string
): Promise<BrokerCredentialRow> {
  if (!isEncryptionAvailable()) {
    throw new Error("BROKER_ENCRYPTION_KEY is not set. Cannot store broker credentials.");
  }
  if (payload.broker_id === "dhan" &&
      (!(payload.credentials.client_id || payload.credentials.clientId) ||
       !(payload.credentials.access_token || payload.credentials.accessToken))) {
    throw new Error("Dhan credentials require a client ID and access token.");
  }
  if (payload.broker_id === "zerodha" &&
      (!(payload.credentials.api_key || payload.credentials.apiKey) ||
       !(payload.credentials.access_token || payload.credentials.accessToken))) {
    throw new Error("Kite credentials require an API key and access token.");
  }
  if ((payload.broker_id === "dhan" || payload.broker_id === "zerodha") && !payload.trading_account_id) {
    throw new Error("An authorized trading account is required for market-data credentials.");
  }

  const db = createServerSupabaseClient();
  if (payload.trading_account_id) {
    const { data: account, error: accountError } = await db
      .from("trading_accounts")
      .select("id, broker_provider")
      .eq("id", payload.trading_account_id)
      .maybeSingle();
    const provider = String(account?.broker_provider ?? "").trim().toLowerCase();
    const matchesProvider = payload.broker_id === "dhan"
      ? provider === "dhan"
      : payload.broker_id === "zerodha"
        ? provider === "kite" || provider === "zerodha"
        : provider === payload.broker_id;
    if (accountError || !account || !matchesProvider) {
      throw new Error("The broker provider does not match the trading account.");
    }
  }

  const encrypted = await encryptCredentials(payload.credentials);
  const { data, error } = await db
    .from("broker_credentials")
    .insert({
      trading_account_id: payload.trading_account_id ?? null,
      broker_id: payload.broker_id,
      label: payload.label || "Default",
      encrypted_credentials: encrypted,
      is_active: false,
      is_connected: false,
      environment: payload.environment || "production",
    })
    .select(CREDENTIAL_COLUMNS)
    .single();
  if (error || !data) throw new Error("Failed to save broker credentials.");
  return toCredentialRow(data as StoredBrokerCredential);
}

export async function updateBrokerCredential(
  id: string,
  payload: UpdateBrokerCredentialsPayload,
  employeeId: string
): Promise<BrokerCredentialRow | null> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.label !== undefined) update.label = payload.label;
  if (payload.environment !== undefined) update.environment = payload.environment;
  if (payload.credentials && Object.keys(payload.credentials).length > 0) {
    if (!isEncryptionAvailable()) {
      throw new Error("BROKER_ENCRYPTION_KEY is not set. Cannot update broker credentials.");
    }
    update.encrypted_credentials = await encryptCredentials(payload.credentials);
    update.is_connected = false;
    update.last_tested_at = null;
    update.last_test_result = null;
  }
  void employeeId;
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_credentials")
    .update(update)
    .eq("id", id)
    .select(CREDENTIAL_COLUMNS)
    .maybeSingle();
  if (error) throw new Error("Failed to update broker credentials.");
  return data ? toCredentialRow(data as StoredBrokerCredential) : null;
}

export async function deleteBrokerCredential(id: string): Promise<void> {
  const db = createServerSupabaseClient();
  const { error } = await db
    .from("broker_credentials")
    .delete()
    .eq("id", id);
  if (error) throw new Error("Failed to delete broker credentials.");
}

export async function setActiveBroker(id: string, _employeeId: string): Promise<void> {
  const db = createServerSupabaseClient();
  const { data: target, error: targetError } = await db
    .from("broker_credentials")
    .select("id, trading_account_id, broker_id, environment")
    .eq("id", id)
    .maybeSingle();
  if (targetError || !target) throw new Error("Broker credential was not found.");

  let deactivateQuery = db
    .from("broker_credentials")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("is_active", true);
  if (target.trading_account_id) {
    deactivateQuery = deactivateQuery
      .eq("trading_account_id", target.trading_account_id)
      .eq("broker_id", target.broker_id)
      .eq("environment", target.environment);
  } else {
    deactivateQuery = deactivateQuery.is("trading_account_id", null);
  }
  const { error: deactivateError } = await deactivateQuery;
  if (deactivateError) throw new Error("Failed to update active broker credentials.");

  const { data, error } = await db
    .from("broker_credentials")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Failed to activate broker credentials.");
}

export async function testBrokerConnection(
  id: string
): Promise<{ success: boolean; message: string; implemented: boolean }> {
  try {
    const loaded = await getDecryptedCredential(id);
    if (!loaded) return { success: false, message: "Broker credentials were not found.", implemented: false };
    const provider = loaded.row.broker_id === "dhan"
      ? new DhanMarketDataProvider(loaded.credentials)
      : loaded.row.broker_id === "zerodha"
        ? new KiteMarketDataProvider(loaded.credentials)
        : null;
    if (!provider) return { success: false, message: "Read-only authentication is not implemented for this provider.", implemented: false };
    await provider.authenticate();
    const db = createServerSupabaseClient();
    await db.from("broker_credentials").update({
      is_connected: true,
      last_tested_at: new Date().toISOString(),
      last_test_result: "Authentication successful.",
    }).eq("id", id);
    return { success: true, message: "Authentication successful.", implemented: true };
  } catch (err) {
    const message = err instanceof MarketDataProviderError ? err.message : "Broker authentication failed.";
    const db = createServerSupabaseClient();
    await db.from("broker_credentials").update({
      is_connected: false,
      last_tested_at: new Date().toISOString(),
      last_test_result: message,
    }).eq("id", id);
    return { success: false, message, implemented: true };
  }
}

export async function testDhanConnection(id: string): Promise<{ success: boolean; message: string }> {
  const result = await testBrokerConnection(id);
  return { success: result.success, message: result.message };
}
