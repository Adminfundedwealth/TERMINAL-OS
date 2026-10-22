import { afterEach, describe, expect, it, vi } from "vitest";

const { createServerSupabaseClient } = vi.hoisted(() => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { createServerSupabaseClient as mockedCreateServerSupabaseClient } from "@/lib/supabase/server";
import { encryptCredentials } from "../lib/security/broker-encryption";
import {
  createBrokerCredential,
  getAllBrokerCredentials,
  getMarketDataCredentialStatus,
  getMarketDataCredentials,
  setActiveBroker,
} from "../server/services/broker-credentials";

const savedEncryptionKey = process.env.BROKER_ENCRYPTION_KEY;
const savedDevMode = process.env.DEV_MODE;
const secretCredentials = {
  client_id: "client-secret-never-return-this",
  access_token: "access-secret-never-return-this",
};
const encryptedValue = "ciphertext-never-return-this";

function createDatabaseMock() {
  const brokerFilters: string[] = [];
  const credentialFilters: Array<[string, unknown]> = [];
  const query: Record<string, (...args: any[]) => any> = {};
  query.eq = vi.fn((column: string, value: string) => {
    credentialFilters.push([column, value]);
    if (column === "broker_id") brokerFilters.push(value);
    return query;
  });
  query.is = vi.fn((column: string, value: unknown) => {
    credentialFilters.push([column, value]);
    return query;
  });
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => ({ data: { encrypted_credentials: encryptedValue }, error: null }));
  query.select = vi.fn(() => query);
  query.then = (resolve: (value: unknown) => unknown) => resolve({ data: [
    {
      id: "credential-row-id",
      trading_account_id: null,
      broker_id: "dhan",
      label: "Unit Test",
      encrypted_credentials: encryptedValue,
      is_active: true,
      is_connected: false,
      last_tested_at: null,
      last_test_result: null,
      environment: "paper",
      created_by: null,
      updated_by: null,
      created_at: "2026-09-29T00:00:00.000Z",
      updated_at: "2026-09-29T00:00:00.000Z",
    },
  ], error: null });
  return {
    brokerFilters,
    credentialFilters,
    query,
    db: {
      from: vi.fn(() => query),
      rpc: vi.fn(async () => ({ data: JSON.stringify(secretCredentials), error: null })),
    },
  };
}

afterEach(() => {
  if (savedEncryptionKey === undefined) delete process.env.BROKER_ENCRYPTION_KEY;
  else process.env.BROKER_ENCRYPTION_KEY = savedEncryptionKey;
  if (savedDevMode === undefined) delete process.env.DEV_MODE;
  else process.env.DEV_MODE = savedDevMode;
  vi.clearAllMocks();
});

describe("encrypted broker credential integration", () => {
  it("stores Founder Dhan credentials globally without looking up a trading account", async () => {
    process.env.BROKER_ENCRYPTION_KEY = "unit-test-only-encryption-key-32-bytes";
    const inserted: Array<Record<string, unknown>> = [];
    const row = {
      id: "global-dhan-credential",
      trading_account_id: null,
      broker_id: "dhan",
      label: "FundedWealth Global Dhan Market Data",
      encrypted_credentials: "encrypted-test-value",
      is_active: false,
      is_connected: false,
      last_tested_at: null,
      last_test_result: null,
      environment: "production",
      created_by: "founder-1",
      updated_by: null,
      created_at: "2026-10-22T00:00:00.000Z",
      updated_at: "2026-10-22T00:00:00.000Z",
    };
    const credentialQuery: Record<string, any> = {};
    credentialQuery.insert = vi.fn((payload: Record<string, unknown>) => {
      inserted.push(payload);
      return credentialQuery;
    });
    credentialQuery.select = vi.fn(() => credentialQuery);
    credentialQuery.single = vi.fn(async () => ({ data: row, error: null }));
    const db = {
      from: vi.fn((table: string) => {
        if (table !== "broker_credentials") throw new Error("Unexpected account lookup");
        return credentialQuery;
      }),
      rpc: vi.fn(async (name: string) => name === "encrypt_broker_credentials"
        ? { data: "encrypted-test-value", error: null }
        : { data: JSON.stringify(secretCredentials), error: null }),
    };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    const saved = await createBrokerCredential({
      broker_id: "dhan",
      label: "FundedWealth Global Dhan Market Data",
      credentials: secretCredentials,
    }, "founder-1");

    expect(saved.trading_account_id).toBeNull();
    expect(saved.broker_id).toBe("dhan");
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      trading_account_id: null,
      broker_id: "dhan",
      environment: "production",
      is_active: false,
      encrypted_credentials: "encrypted-test-value",
    });
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(saved)).not.toContain(secretCredentials.access_token);
  });

  it("keeps provider matching for explicitly account-scoped credentials", async () => {
    process.env.BROKER_ENCRYPTION_KEY = "unit-test-only-encryption-key-32-bytes";
    const accountQuery: Record<string, any> = {};
    accountQuery.select = vi.fn(() => accountQuery);
    accountQuery.eq = vi.fn(() => accountQuery);
    accountQuery.maybeSingle = vi.fn(async () => ({
      data: { id: "account-1", broker_provider: "zerodha" },
      error: null,
    }));
    const db = { from: vi.fn(() => accountQuery) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    await expect(createBrokerCredential({
      trading_account_id: "account-1",
      broker_id: "dhan",
      credentials: secretCredentials,
    }, "founder-1")).rejects.toThrow("The broker provider does not match the trading account.");
    expect(db.from).toHaveBeenCalledWith("trading_accounts");
  });

  it("returns only masked credential summaries to the broker API", async () => {
    process.env.BROKER_ENCRYPTION_KEY = "unit-test-only-encryption-key-32-bytes";
    const { db } = createDatabaseMock();
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    const response = await getAllBrokerCredentials();
    const serialized = JSON.stringify(response);

    expect(response[0].masked_credentials.access_token).toContain("••••••••");
    expect(serialized).not.toContain(secretCredentials.client_id);
    expect(serialized).not.toContain(secretCredentials.access_token);
    expect(serialized).not.toContain(encryptedValue);
    expect(response[0]).not.toHaveProperty("encrypted_credentials");
  });

  it("uses the active global market-data credentials for any account or no account", async () => {
    process.env.BROKER_ENCRYPTION_KEY = "unit-test-only-encryption-key-32-bytes";
    const { db, brokerFilters, credentialFilters, query } = createDatabaseMock();
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    await getMarketDataCredentials("dhan-account-1", "dhan");
    await getMarketDataCredentials("dhan-account-2", "dhan", "paper");
    await getMarketDataCredentials("kite-account-1", "kite");
    await getMarketDataCredentials("kite-account-2", "kite", "sandbox");
    await getMarketDataCredentials(undefined, "dhan");

    expect(brokerFilters).toEqual(["dhan", "dhan", "zerodha", "zerodha", "dhan"]);
    expect(credentialFilters).toEqual([
      ["broker_id", "dhan"],
      ["trading_account_id", null],
      ["environment", "production"],
      ["is_active", true],
      ["broker_id", "dhan"],
      ["trading_account_id", null],
      ["environment", "paper"],
      ["is_active", true],
      ["broker_id", "zerodha"],
      ["trading_account_id", null],
      ["environment", "production"],
      ["is_active", true],
      ["broker_id", "zerodha"],
      ["trading_account_id", null],
      ["environment", "sandbox"],
      ["is_active", true],
      ["broker_id", "dhan"],
      ["trading_account_id", null],
      ["environment", "production"],
      ["is_active", true],
    ]);
    expect(query.order).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledTimes(5);
    expect(db.rpc).toHaveBeenCalledWith("decrypt_broker_credentials", expect.objectContaining({
      ciphertext: encryptedValue,
      passphrase: "unit-test-only-encryption-key-32-bytes",
    }));
  });

  it("falls back to a legacy account-scoped key only when no global key exists", async () => {
    process.env.BROKER_ENCRYPTION_KEY = "unit-test-only-encryption-key-32-bytes";
    const filters: Array<Array<[string, unknown]>> = [];
    const makeQuery = (result: { data: unknown; error: null }) => {
      const currentFilters: Array<[string, unknown]> = [];
      filters.push(currentFilters);
      const query: Record<string, (...args: any[]) => any> = {};
      query.select = vi.fn(() => query);
      query.eq = vi.fn((column: string, value: unknown) => {
        currentFilters.push([column, value]);
        return query;
      });
      query.is = vi.fn((column: string, value: unknown) => {
        currentFilters.push([column, value]);
        return query;
      });
      query.maybeSingle = vi.fn(async () => result);
      return query;
    };
    const db = {
      from: vi.fn()
        .mockReturnValueOnce(makeQuery({ data: null, error: null }))
        .mockReturnValueOnce(makeQuery({ data: { encrypted_credentials: encryptedValue }, error: null })),
      rpc: vi.fn(async () => ({ data: JSON.stringify(secretCredentials), error: null })),
    };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    await getMarketDataCredentials("dhan-account-1", "dhan");

    expect(filters).toEqual([
      [["broker_id", "dhan"], ["trading_account_id", null], ["environment", "production"], ["is_active", true]],
      [["broker_id", "dhan"], ["trading_account_id", "dhan-account-1"], ["environment", "production"], ["is_active", true]],
    ]);
    expect(db.rpc).toHaveBeenCalledWith("decrypt_broker_credentials", expect.objectContaining({
      ciphertext: encryptedValue,
      passphrase: "unit-test-only-encryption-key-32-bytes",
    }));
  });

  it("allows accountless data only from an active global credential", async () => {
    const query: Record<string, (...args: any[]) => any> = {};
    query.eq = vi.fn(() => query);
    query.is = vi.fn(() => query);
    query.select = vi.fn(() => query);
    query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const db = { from: vi.fn(() => query) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    const error: unknown = await getMarketDataCredentials(undefined, "dhan")
      .catch((failure: unknown) => failure);

    expect(error).toMatchObject({ code: "MISSING_CREDENTIALS" });
    expect(db.from).toHaveBeenCalledTimes(1);
  });

  it("does not expose free-form stored provider status text", async () => {
    const privateStatus = "upstream rejected token private-access-secret";
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      is: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({
        data: { is_connected: false, last_tested_at: "2026-09-29T00:00:00.000Z", last_test_result: privateStatus },
        error: null,
      })),
    };
    const db = { from: vi.fn(() => query) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    const status = await getMarketDataCredentialStatus("account-1", "dhan", "paper");

    expect(status.last_test_result).toBe("Authentication failed.");
    expect(JSON.stringify(status)).not.toContain("private-access-secret");
    expect(query.is).toHaveBeenCalledWith("trading_account_id", null);
    expect(query.eq).toHaveBeenCalledWith("environment", "paper");
  });

  it("fails safely when no active credential exists for the requested environment", async () => {
    const query: Record<string, (...args: any[]) => any> = {};
    query.eq = vi.fn(() => query);
    query.is = vi.fn(() => query);
    query.select = vi.fn(() => query);
    query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const db = { from: vi.fn(() => query) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    const error: unknown = await getMarketDataCredentials("account-1", "dhan", "paper")
      .catch((failure: unknown) => failure);

    expect(error).toMatchObject({ code: "MISSING_CREDENTIALS" });
    expect(query.eq).toHaveBeenCalledWith("environment", "paper");
    expect(query.eq).toHaveBeenCalledWith("is_active", true);
    expect((error as Error).message).not.toContain("access_token");
  });

  it("activates assigned credentials per account/provider/environment and keeps legacy active scope global", async () => {
    const makeQuery = (result: { data?: unknown; error: null }) => {
      const query: Record<string, any> = {};
      query.select = vi.fn(() => query);
      query.update = vi.fn(() => query);
      query.eq = vi.fn(() => query);
      query.is = vi.fn(() => query);
      query.maybeSingle = vi.fn(async () => result);
      query.then = (resolve: (value: unknown) => unknown) => resolve({ error: null });
      return query;
    };
    const assignedTarget = makeQuery({ data: {
      id: "credential-1",
      trading_account_id: "account-1",
      broker_id: "dhan",
      environment: "paper",
    }, error: null });
    const assignedDeactivation = makeQuery({ error: null });
    const assignedActivation = makeQuery({ data: { id: "credential-1" }, error: null });
    const assignedDb = { from: vi.fn().mockReturnValueOnce(assignedTarget).mockReturnValueOnce(assignedDeactivation).mockReturnValueOnce(assignedActivation) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(assignedDb as never);

    await setActiveBroker("credential-1", "employee-1");

    expect(assignedDeactivation.eq).toHaveBeenCalledWith("trading_account_id", "account-1");
    expect(assignedDeactivation.eq).toHaveBeenCalledWith("broker_id", "dhan");
    expect(assignedDeactivation.eq).toHaveBeenCalledWith("environment", "paper");

    const legacyTarget = makeQuery({ data: {
      id: "legacy-credential",
      trading_account_id: null,
      broker_id: "zerodha",
      environment: "production",
    }, error: null });
    const legacyDeactivation = makeQuery({ error: null });
    const legacyActivation = makeQuery({ data: { id: "legacy-credential" }, error: null });
    const legacyDb = { from: vi.fn().mockReturnValueOnce(legacyTarget).mockReturnValueOnce(legacyDeactivation).mockReturnValueOnce(legacyActivation) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(legacyDb as never);

    await setActiveBroker("legacy-credential", "employee-1");

    expect(legacyDeactivation.is).toHaveBeenCalledWith("trading_account_id", null);
    expect(legacyDeactivation.eq).toHaveBeenCalledWith("is_active", true);
    expect(legacyDeactivation.eq).not.toHaveBeenCalledWith("broker_id", "zerodha");
    expect(legacyDeactivation.eq).not.toHaveBeenCalledWith("environment", "production");
  });

  it("fails closed when encryption RPC fails, including in development mode", async () => {
    process.env.BROKER_ENCRYPTION_KEY = "unit-test-only-encryption-key-32-bytes";
    process.env.DEV_MODE = "true";
    const db = { rpc: vi.fn(async () => ({ data: null, error: { message: "private rpc details" } })) };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    const error: unknown = await encryptCredentials(secretCredentials).catch((failure: unknown) => failure);

    expect((error as Error).message).toContain("Failed to encrypt broker credentials");
    expect((error as Error).message).not.toContain(secretCredentials.access_token);
    expect((error as Error).message).not.toContain("private rpc details");
    expect((error as Error).message).not.toContain("DEV_UNENCRYPTED");
  });
});