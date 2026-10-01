import { afterEach, describe, expect, it, vi } from "vitest";

const { createServerSupabaseClient } = vi.hoisted(() => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { createServerSupabaseClient as mockedCreateServerSupabaseClient } from "@/lib/supabase/server";
import { encryptCredentials } from "../lib/security/broker-encryption";
import {
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

  it("selects only active credentials scoped to the requested account and broker", async () => {
    process.env.BROKER_ENCRYPTION_KEY = "unit-test-only-encryption-key-32-bytes";
    const { db, brokerFilters, credentialFilters, query } = createDatabaseMock();
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    await getMarketDataCredentials("dhan-account-1", "dhan");
    await getMarketDataCredentials("dhan-account-2", "dhan", "paper");
    await getMarketDataCredentials("kite-account-1", "kite");
    await getMarketDataCredentials("kite-account-2", "kite", "sandbox");

    expect(brokerFilters).toEqual(["dhan", "dhan", "zerodha", "zerodha"]);
    expect(credentialFilters).toEqual([
      ["broker_id", "dhan"],
      ["trading_account_id", "dhan-account-1"],
      ["environment", "production"],
      ["is_active", true],
      ["broker_id", "dhan"],
      ["trading_account_id", "dhan-account-2"],
      ["environment", "paper"],
      ["is_active", true],
      ["broker_id", "zerodha"],
      ["trading_account_id", "kite-account-1"],
      ["environment", "production"],
      ["is_active", true],
      ["broker_id", "zerodha"],
      ["trading_account_id", "kite-account-2"],
      ["environment", "sandbox"],
      ["is_active", true],
    ]);
    expect(query.order).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledTimes(4);
    expect(db.rpc).toHaveBeenCalledWith("decrypt_broker_credentials", expect.objectContaining({
      ciphertext: encryptedValue,
      passphrase: "unit-test-only-encryption-key-32-bytes",
    }));
  });

  it("cannot fall back to a global latest credential when account context is missing", async () => {
    const error: unknown = await getMarketDataCredentials("", "dhan").catch((failure: unknown) => failure);

    expect(error).toMatchObject({ code: "INVALID_REQUEST" });
    expect(mockedCreateServerSupabaseClient).not.toHaveBeenCalled();
  });

  it("does not expose free-form stored provider status text", async () => {
    const privateStatus = "upstream rejected token private-access-secret";
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
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
    expect(query.eq).toHaveBeenCalledWith("environment", "paper");
  });

  it("fails safely when no active credential exists for the requested environment", async () => {
    const query: Record<string, (...args: any[]) => any> = {};
    query.eq = vi.fn(() => query);
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