import { afterEach, describe, expect, it, vi } from "vitest";

const { createServerSupabaseClient } = vi.hoisted(() => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));
vi.mock("@/lib/logger", () => ({ serverLog: vi.fn() }));
vi.mock("@/lib/security/broker-encryption", () => ({
  encryptCredentials: vi.fn(async () => "central-ciphertext"),
  decryptCredentials: vi.fn(async () => ({ api_key: "masked-test-value", access_token: "masked-test-value" })),
  maskCredentialMap: vi.fn(() => ({ api_key: "••••••••value", access_token: "••••••••value" })),
  isEncryptionAvailable: vi.fn(() => true),
}));

import { createServerSupabaseClient as mockedCreateServerSupabaseClient } from "@/lib/supabase/server";
import { serverLog } from "@/lib/logger";
import { decryptCredentials } from "@/lib/security/broker-encryption";
import { MarketDataProviderError } from "../server/brokers/provider-error";
import {
  bindAccountToCentralBrokerConnection,
  classifyBrokerTestFailure,
  createCentralBrokerConnection,
  deactivateCentralBrokerConnection,
  getCentralCredentialsForAccount,
  testCentralBrokerConnection,
  type BrokerConnectionScope,
} from "../server/services/broker-connections";
import { PERMISSIONS, hasPermission } from "@/lib/rbac/permissions";
import type { BrokerId } from "@/types/broker";

function chain(result: { data?: unknown; error: null }) {
  const query: Record<string, any> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.is = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => result);
  query.insert = vi.fn(() => query);
  query.update = vi.fn(() => query);
  query.upsert = vi.fn(async () => result);
  query.single = vi.fn(async () => result);
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return query;
}

afterEach(() => vi.clearAllMocks());

describe("FundedWealth central broker connections", () => {
  it.each([
    { error: new MarketDataProviderError("dhan", "INVALID_CREDENTIALS", 401), expected: { category: "DHAN_HTTP_401", httpStatus: 401 } },
    { error: new MarketDataProviderError("dhan", "INVALID_CREDENTIALS", 403), expected: { category: "DHAN_HTTP_403", httpStatus: 403 } },
    { error: new MarketDataProviderError("dhan", "UPSTREAM_ERROR", 502), expected: { category: "DHAN_OTHER_HTTP_ERROR", httpStatus: 502 } },
    { error: new TypeError("fetch failed"), expected: { category: "DHAN_NETWORK_ERROR" } },
    { error: new Error("private provider details"), expected: { category: "UNKNOWN_PROVIDER_ERROR" } },
  ])("classifies provider failures without exposing error text", ({ error, expected }: { error: Error; expected: { category: string; httpStatus?: number } }) => {
    expect(classifyBrokerTestFailure("dhan", error)).toEqual(expected);
    expect(JSON.stringify(classifyBrokerTestFailure("dhan", error))).not.toContain(error.message);
  });

  it("classifies decryption errors and logs only a safe category", async () => {
    const row = {
      id: "central-connection",
      broker_id: "dhan",
      environment: "production",
      encrypted_credentials: "ciphertext",
    };
    const query = chain({ data: row, error: null });
    const db = { from: vi.fn(() => query) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);
    vi.mocked(decryptCredentials).mockRejectedValueOnce(new Error("private decryption details"));

    const result = await testCentralBrokerConnection(
      "central-connection",
      { broker_id: "dhan", environment: "production" },
      "employee-1",
    );

    expect(result).toMatchObject({ success: false, message: "Broker authentication failed." });
    expect(serverLog).toHaveBeenCalledWith("error", "broker", "central_connection_test_failed", {
      broker_id: "dhan",
      failure_category: "CREDENTIAL_DECRYPTION_FAILED",
    });
    expect(JSON.stringify(vi.mocked(serverLog).mock.calls)).not.toContain("private decryption details");
  });

  it("deactivates a central connection without deleting it", async () => {
    const query = chain({ data: { id: "central-connection" }, error: null });
    const db = { from: vi.fn(() => query) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    await deactivateCentralBrokerConnection("central-connection", "employee-1");

    expect(db.from).toHaveBeenCalledWith("broker_connections");
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      is_active: false,
      updated_by: "employee-1",
    }));
    expect(query.eq).toHaveBeenCalledWith("id", "central-connection");
  });

  it("creates encrypted central connection storage without a customer account owner", async () => {
    const row = {
      id: "central-connection",
      trading_account_id: null,
      broker_id: "zerodha",
      label: "FundedWealth Kite",
      encrypted_credentials: "central-ciphertext",
      is_active: false,
      is_connected: false,
      last_tested_at: null,
      last_test_result: null,
      environment: "production",
      created_by: "employee-1",
      updated_by: "employee-1",
      created_at: "2026-09-30T00:00:00.000Z",
      updated_at: "2026-09-30T00:00:00.000Z",
    };
    const query = chain({ data: row, error: null });
    const db = { from: vi.fn(() => query) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    const result = await createCentralBrokerConnection(
      { broker_id: "zerodha", environment: "production" },
      "FundedWealth Kite",
      { api_key: "not-a-real-secret", access_token: "not-a-real-secret" },
      "employee-1",
    );

    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      broker_id: "zerodha",
      environment: "production",
      encrypted_credentials: "central-ciphertext",
      connection_status: "untested",
      health_metadata: {},
    }));
    expect(query.insert.mock.calls[0][0]).not.toHaveProperty("trading_account_id");
    expect(result).toMatchObject({ id: "central-connection", broker_id: "zerodha" });
    expect(JSON.stringify(result)).not.toContain("not-a-real-secret");
    expect(result).not.toHaveProperty("encrypted_credentials");
  });

  it("allows multiple accounts to bind to one central connection", async () => {
    const accountQuery = chain({ data: { id: "account-a" }, error: null });
    const connectionQuery = chain({ data: { id: "central-connection", is_active: true }, error: null });
    const bindingQueryA = chain({ error: null });
    const dbA = { from: vi.fn().mockReturnValueOnce(accountQuery).mockReturnValueOnce(connectionQuery).mockReturnValueOnce(bindingQueryA) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(dbA as never);
    await bindAccountToCentralBrokerConnection("account-a", "central-connection", "employee-1");
    expect(dbA.from).toHaveBeenNthCalledWith(3, "trading_account_broker_connections");
    expect(bindingQueryA.upsert).toHaveBeenCalledWith(expect.objectContaining({ trading_account_id: "account-a", broker_connection_id: "central-connection", is_active: true }), { onConflict: "trading_account_id,broker_connection_id" });

    const accountQueryB = chain({ data: { id: "account-b" }, error: null });
    const connectionQueryB = chain({ data: { id: "central-connection", is_active: true }, error: null });
    const bindingQueryB = chain({ error: null });
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue({ from: vi.fn().mockReturnValueOnce(accountQueryB).mockReturnValueOnce(connectionQueryB).mockReturnValueOnce(bindingQueryB) } as never);
    await bindAccountToCentralBrokerConnection("account-b", "central-connection", "employee-1");
    expect(bindingQueryB.upsert).toHaveBeenCalledWith(expect.objectContaining({ trading_account_id: "account-b", broker_connection_id: "central-connection" }), { onConflict: "trading_account_id,broker_connection_id" });

    const accountQueryC = chain({ data: { id: "account-c" }, error: null });
    const connectionQueryC = chain({ data: { id: "central-connection", is_active: true }, error: null });
    const bindingQueryC = chain({ error: null });
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue({ from: vi.fn().mockReturnValueOnce(accountQueryC).mockReturnValueOnce(connectionQueryC).mockReturnValueOnce(bindingQueryC) } as never);
    await bindAccountToCentralBrokerConnection("account-c", "central-connection", "employee-1");
    expect(bindingQueryC.upsert).toHaveBeenCalledWith(expect.objectContaining({ trading_account_id: "account-c", broker_connection_id: "central-connection" }), { onConflict: "trading_account_id,broker_connection_id" });
  });

  it("resolves only an active central connection for the requested account/provider/environment", async () => {
    const bindingQuery = chain({ data: { broker_connection_id: "central-connection" }, error: null });
    const connectionQuery = chain({ data: { encrypted_credentials: "central-ciphertext" }, error: null });
    const db = { from: vi.fn().mockReturnValueOnce(bindingQuery).mockReturnValueOnce(connectionQuery) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    const credentials = await getCentralCredentialsForAccount("account-a", { broker_id: "dhan", environment: "production" });

    expect(db.from).toHaveBeenNthCalledWith(1, "trading_account_broker_connections");
    expect(bindingQuery.eq).toHaveBeenCalledWith("trading_account_id", "account-a");
    expect(bindingQuery.eq).toHaveBeenCalledWith("is_active", true);
    expect(connectionQuery.eq).toHaveBeenCalledWith("id", "central-connection");
    expect(connectionQuery.eq).toHaveBeenCalledWith("broker_id", "dhan");
    expect(connectionQuery.eq).toHaveBeenCalledWith("environment", "production");
    expect(connectionQuery.eq).toHaveBeenCalledWith("is_active", true);
    expect(connectionQuery.eq).toHaveBeenCalledWith("is_connected", true);
    expect(connectionQuery.eq).toHaveBeenCalledWith("connection_status", "connected");
    expect(credentials).toEqual({ api_key: "masked-test-value", access_token: "masked-test-value" });
  });

  it("rejects an account with no active central binding", async () => {
    const bindingQuery = chain({ data: null, error: null });
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue({ from: vi.fn(() => bindingQuery) } as never);

    await expect(getCentralCredentialsForAccount("unbound-account", {
      broker_id: "dhan",
      environment: "production",
    })).rejects.toMatchObject({ code: "MISSING_CREDENTIALS" });
    expect(bindingQuery.eq).toHaveBeenCalledWith("trading_account_id", "unbound-account");
    expect(bindingQuery.eq).toHaveBeenCalledWith("is_active", true);
  });

  it.each([
    { broker_id: "zerodha" as const, environment: "production" as const },
    { broker_id: "dhan" as const, environment: "paper" as const },
    { broker_id: "dhan" as const, environment: "production" as const },
  ])("does not decrypt an unbound, mismatched, or inactive connection scope", async (scope: BrokerConnectionScope) => {
    const bindingQuery = chain({ data: { broker_connection_id: "central-connection" }, error: null });
    const connectionQuery = chain({ data: null, error: null });
    const db = { from: vi.fn().mockReturnValueOnce(bindingQuery).mockReturnValueOnce(connectionQuery) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    await expect(getCentralCredentialsForAccount("account-a", scope))
      .rejects.toMatchObject({ code: "MISSING_CREDENTIALS" });
    expect(connectionQuery.eq).toHaveBeenCalledWith("broker_id", scope.broker_id);
    expect(connectionQuery.eq).toHaveBeenCalledWith("environment", scope.environment);
    expect(connectionQuery.eq).toHaveBeenCalledWith("is_active", true);
    expect(decryptCredentials).not.toHaveBeenCalled();
  });

  it("does not grant broker management permission to non-admin terminal roles", () => {
    expect(hasPermission("ADMIN", PERMISSIONS.BROKER_MANAGE)).toBe(true);
    expect(hasPermission("TRADING_OPERATIONS", PERMISSIONS.BROKER_MANAGE)).toBe(false);
    expect(hasPermission("SUPPORT", PERMISSIONS.BROKER_MANAGE)).toBe(false);
  });
});
