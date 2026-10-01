/**
 * FundedWealth-owned broker connections.
 *
 * broker_credentials is retained as an untouched legacy account-scoped store.
 * New FundedWealth-owned connections live in broker_connections and accounts
 * may only route through an explicit binding.
 */
import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MarketDataProviderError } from "@/server/brokers/provider-error";
import { DhanMarketDataProvider } from "@/server/brokers/dhan";
import { KiteMarketDataProvider } from "@/server/brokers/kite";
import { serverLog } from "@/lib/logger";
import {
  decryptCredentials,
  encryptCredentials,
  isEncryptionAvailable,
  maskCredentialMap,
} from "@/lib/security/broker-encryption";
import type { BrokerCredentialMap } from "@/server/brokers/types";
import type { BrokerConnectionRow, BrokerId } from "@/types/broker";

export interface BrokerConnectionScope {
  broker_id: BrokerId;
  environment: "production" | "paper" | "sandbox";
}

function validateCredentials(brokerId: BrokerId, credentials: BrokerCredentialMap): void {
  if (Object.keys(credentials).length === 0 || Object.values(credentials).some((value) => !value.trim())) {
    throw new Error("Broker credentials must not be empty.");
  }
  if (brokerId === "dhan" &&
      (!(credentials.client_id || credentials.clientId) || !(credentials.access_token || credentials.accessToken))) {
    throw new Error("Dhan credentials require a client ID and access token.");
  }
  if (brokerId === "zerodha" &&
      (!(credentials.api_key || credentials.apiKey) || !(credentials.access_token || credentials.accessToken))) {
    throw new Error("Kite credentials require an API key and access token.");
  }
}

const CONNECTION_COLUMNS = [
  "id", "broker_id", "label", "encrypted_credentials",
  "is_active", "is_connected", "last_tested_at", "last_test_result", "environment",
  "connection_status", "health_metadata", "created_by", "updated_by", "created_at", "updated_at",
].join(", ");

export type BrokerTestFailureCategory =
  | "CREDENTIAL_DECRYPTION_FAILED"
  | "DHAN_HTTP_401"
  | "DHAN_HTTP_403"
  | "DHAN_NETWORK_ERROR"
  | "DHAN_OTHER_HTTP_ERROR"
  | "UNKNOWN_PROVIDER_ERROR";

export function classifyBrokerTestFailure(
  brokerId: BrokerId,
  error: unknown,
  stage: "decryption" | "provider" = "provider",
): { category: BrokerTestFailureCategory; httpStatus?: number } {
  if (stage === "decryption") return { category: "CREDENTIAL_DECRYPTION_FAILED" };

  const httpStatus = error instanceof MarketDataProviderError
    ? error.upstreamStatus
    : undefined;
  if (brokerId === "dhan") {
    if (httpStatus === 401) return { category: "DHAN_HTTP_401", httpStatus };
    if (httpStatus === 403) return { category: "DHAN_HTTP_403", httpStatus };
    if (httpStatus !== undefined && httpStatus >= 400) {
      return { category: "DHAN_OTHER_HTTP_ERROR", httpStatus };
    }
    if (isDhanNetworkError(error)) return { category: "DHAN_NETWORK_ERROR" };
  }

  return {
    category: "UNKNOWN_PROVIDER_ERROR",
    ...(httpStatus === undefined ? {} : { httpStatus }),
  };
}

const DHAN_NETWORK_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

function isDhanNetworkError(error: unknown): boolean {
  let current = error;
  while (current instanceof Error) {
    const currentError = current as Error & { cause?: unknown; code?: unknown };
    if (current.name === "AbortError" || current.name === "TimeoutError") return true;
    if (typeof currentError.code === "string" && DHAN_NETWORK_ERROR_CODES.has(currentError.code)) {
      return true;
    }
    current = currentError.cause;
  }
  return error instanceof TypeError && error.message === "fetch failed";
}

function logBrokerTestFailure(
  brokerId: BrokerId,
  error: unknown,
  stage: "decryption" | "provider",
): void {
  const failure = classifyBrokerTestFailure(brokerId, error, stage);
  serverLog("error", "broker", "central_connection_test_failed", {
    broker_id: brokerId,
    failure_category: failure.category,
    ...(failure.httpStatus === undefined ? {} : { http_status: failure.httpStatus }),
  });
}

type StoredConnection = {
  id: string;
  broker_id: BrokerId;
  label: string;
  encrypted_credentials: string;
  is_active: boolean;
  is_connected: boolean;
  last_tested_at: string | null;
  last_test_result: string | null;
  environment: BrokerConnectionScope["environment"];
  connection_status: "untested" | "connected" | "error";
  health_metadata: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

async function safeRow(row: StoredConnection): Promise<BrokerConnectionRow> {
  let masked_credentials: Record<string, string> = {};
  try {
    masked_credentials = maskCredentialMap(await decryptCredentials(row.encrypted_credentials));
  } catch {
    // Keep the admin response safe if ciphertext cannot be read.
  }
  return {
    id: row.id,
    broker_id: row.broker_id,
    label: row.label,
    masked_credentials,
    is_active: row.is_active,
    is_connected: row.is_connected,
    last_tested_at: row.last_tested_at,
    last_test_result: row.last_test_result,
    environment: row.environment,
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    connection_status: row.connection_status,
    health_metadata: row.health_metadata,
  };
}

export async function getCentralBrokerConnections(): Promise<BrokerConnectionRow[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_connections")
    .select(CONNECTION_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Failed to fetch FundedWealth broker connections.");
  return Promise.all(((data ?? []) as StoredConnection[]).map(safeRow));
}

export async function getCentralBrokerConnectionById(id: string): Promise<BrokerConnectionRow | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_connections")
    .select(CONNECTION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return safeRow(data as StoredConnection);
}

export async function createCentralBrokerConnection(
  scope: BrokerConnectionScope,
  label: string,
  credentials: BrokerCredentialMap,
  employeeId: string,
): Promise<BrokerConnectionRow> {
  if (!isEncryptionAvailable()) throw new Error("BROKER_ENCRYPTION_KEY is not configured.");
  validateCredentials(scope.broker_id, credentials);
  const encrypted_credentials = await encryptCredentials(credentials);
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_connections")
    .insert({
      broker_id: scope.broker_id,
      label: label || "Default",
      encrypted_credentials,
      is_active: false,
      is_connected: false,
      connection_status: "untested",
      health_metadata: {},
      environment: scope.environment,
      created_by: employeeId,
      updated_by: employeeId,
    })
    .select(CONNECTION_COLUMNS)
    .single();
  if (error || !data) throw new Error("Failed to save FundedWealth broker connection.");
  return safeRow(data as StoredConnection);
}

export async function getCentralBrokerConnectionTestTarget(
  id: string,
  scope: BrokerConnectionScope,
): Promise<string | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_connections")
    .select("id")
    .eq("id", id)
    .eq("broker_id", scope.broker_id)
    .eq("environment", scope.environment)
    .maybeSingle();
  if (error) throw new Error("Failed to load broker connection metadata.");
  return data?.id ?? null;
}

export async function updateCentralBrokerConnection(
  id: string,
  payload: { label?: string; environment?: BrokerConnectionScope["environment"]; credentials?: BrokerCredentialMap },
  employeeId: string,
): Promise<BrokerConnectionRow | null> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: employeeId };
  if (payload.label !== undefined) update.label = payload.label;
  if (payload.environment !== undefined) {
    update.environment = payload.environment;
    update.is_connected = false;
    update.connection_status = "untested";
    update.last_tested_at = null;
    update.last_test_result = null;
    update.health_metadata = {};
  }
  if (payload.credentials && Object.keys(payload.credentials).length > 0) {
    if (!isEncryptionAvailable()) throw new Error("BROKER_ENCRYPTION_KEY is not configured.");
    const existing = await getCentralBrokerConnectionById(id);
    if (!existing) return null;
    validateCredentials(existing.broker_id, payload.credentials);
    update.encrypted_credentials = await encryptCredentials(payload.credentials);
    update.is_connected = false;
    update.connection_status = "untested";
    update.last_tested_at = null;
    update.last_test_result = null;
    update.health_metadata = {};
  }
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_connections")
    .update(update)
    .eq("id", id)
    .select(CONNECTION_COLUMNS)
    .maybeSingle();
  if (error) throw new Error("Failed to update FundedWealth broker connection.");
  return data ? safeRow(data as StoredConnection) : null;
}

export async function activateCentralBrokerConnection(id: string, employeeId: string): Promise<void> {
  const db = createServerSupabaseClient();
  const { data: target, error: targetError } = await db
    .from("broker_connections")
    .select("id,broker_id,environment,is_connected,connection_status")
    .eq("id", id)
    .maybeSingle();
  if (targetError || !target) throw new Error("FundedWealth broker connection was not found.");
  if (target.is_connected !== true || target.connection_status !== "connected") {
    throw new Error("Test the broker connection successfully before activating it.");
  }
  const { error: deactivateError } = await db
    .from("broker_connections")
    .update({ is_active: false, updated_at: new Date().toISOString(), updated_by: employeeId })
    .eq("broker_id", target.broker_id)
    .eq("environment", target.environment)
    .eq("is_active", true);
  if (deactivateError) throw new Error("Failed to update active FundedWealth broker connection.");
  const { data, error } = await db
    .from("broker_connections")
    .update({ is_active: true, updated_at: new Date().toISOString(), updated_by: employeeId })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error("Failed to activate FundedWealth broker connection.");
}

export async function deactivateCentralBrokerConnection(id: string, employeeId: string): Promise<void> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_connections")
    .update({ is_active: false, updated_at: new Date().toISOString(), updated_by: employeeId })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw new Error("Failed to deactivate FundedWealth broker connection.");
  if (!data) throw new Error("FundedWealth broker connection was not found.");
}

export async function testCentralBrokerConnection(
  id: string,
  scope: BrokerConnectionScope,
  employeeId: string,
): Promise<{ success: boolean; message: string; implemented: boolean }> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("broker_connections")
    .select(CONNECTION_COLUMNS)
    .eq("id", id)
    .eq("broker_id", scope.broker_id)
    .eq("environment", scope.environment)
    .maybeSingle();
  if (error || !data) return { success: false, message: "FundedWealth broker connection was not found.", implemented: false };

  const row = data as StoredConnection;
  let success = false;
  let implemented = true;
  let message = "Broker authentication failed.";
  let credentials: BrokerCredentialMap | undefined;
  try {
    credentials = await decryptCredentials(row.encrypted_credentials);
  } catch (error) {
    logBrokerTestFailure(scope.broker_id, error, "decryption");
  }

  if (credentials) {
    try {
    if (scope.broker_id === "dhan") await new DhanMarketDataProvider(credentials).authenticate();
    else if (scope.broker_id === "zerodha") await new KiteMarketDataProvider(credentials).authenticate();
    else {
      implemented = false;
      message = "Read-only authentication is not implemented for this provider.";
    }
    success = implemented;
    if (success) message = "Authentication successful.";
    } catch (error) {
      logBrokerTestFailure(scope.broker_id, error, "provider");
      message = "Broker authentication failed.";
    }
  }

  const checkedAt = new Date().toISOString();
  const { error: updateError } = await db
    .from("broker_connections")
    .update({
      is_connected: success,
      connection_status: success ? "connected" : implemented ? "error" : "untested",
      last_tested_at: checkedAt,
      last_test_result: message,
      health_metadata: { last_test_status: success ? "success" : implemented ? "error" : "not_implemented", last_tested_at: checkedAt },
      updated_by: employeeId,
      updated_at: checkedAt,
    })
    .eq("id", id)
    .eq("broker_id", scope.broker_id)
    .eq("environment", scope.environment);
  if (updateError) return { success: false, message: "Broker connection status could not be saved.", implemented };
  return { success, message, implemented };
}

export async function getCentralCredentialsForAccount(
  tradingAccountId: string,
  scope: BrokerConnectionScope,
): Promise<BrokerCredentialMap> {
  const db = createServerSupabaseClient();
  const { data: binding, error: bindingError } = await db
    .from("trading_account_broker_connections")
    .select("broker_connection_id")
    .eq("trading_account_id", tradingAccountId)
    .eq("is_active", true)
    .maybeSingle();
  if (bindingError || !binding?.broker_connection_id) {
    throw new MarketDataProviderError(scope.broker_id === "zerodha" ? "kite" : "dhan", "MISSING_CREDENTIALS");
  }

  const { data: connection, error } = await db
    .from("broker_connections")
    .select("encrypted_credentials")
    .eq("id", binding.broker_connection_id)
    .eq("broker_id", scope.broker_id)
    .eq("environment", scope.environment)
    .eq("is_active", true)
    .eq("is_connected", true)
    .eq("connection_status", "connected")
    .maybeSingle();
  if (error || !connection?.encrypted_credentials) {
    throw new MarketDataProviderError(scope.broker_id === "zerodha" ? "kite" : "dhan", "MISSING_CREDENTIALS");
  }
  try {
    return await decryptCredentials(connection.encrypted_credentials);
  } catch {
    throw new MarketDataProviderError(scope.broker_id === "zerodha" ? "kite" : "dhan", "CREDENTIAL_STORAGE_ERROR");
  }
}

export async function bindAccountToCentralBrokerConnection(
  tradingAccountId: string,
  brokerConnectionId: string,
  employeeId: string,
): Promise<void> {
  const db = createServerSupabaseClient();
  const { data: account, error: accountError } = await db
    .from("trading_accounts")
    .select("id")
    .eq("id", tradingAccountId)
    .maybeSingle();
  if (accountError || !account) throw new Error("Trading account was not found.");

  const { data: connection, error: connectionError } = await db
    .from("broker_connections")
    .select("id,is_active")
    .eq("id", brokerConnectionId)
    .maybeSingle();
  if (connectionError || !connection || connection.is_active !== true) {
    throw new Error("Only an active FundedWealth broker connection can be bound.");
  }

  const { error } = await db
    .from("trading_account_broker_connections")
    .upsert({
      trading_account_id: tradingAccountId,
      broker_connection_id: brokerConnectionId,
      is_active: true,
      created_by: employeeId,
      updated_by: employeeId,
    }, { onConflict: "trading_account_id,broker_connection_id" });
  if (error) throw new Error("Failed to bind the broker connection to the trading account.");
}
