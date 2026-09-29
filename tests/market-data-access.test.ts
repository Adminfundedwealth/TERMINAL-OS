import { beforeEach, describe, expect, it, vi } from "vitest";

const { createRouteHandlerSupabaseClient, rpc, getMarketDataCredentials } = vi.hoisted(() => ({
  createRouteHandlerSupabaseClient: vi.fn(),
  rpc: vi.fn(),
  getMarketDataCredentials: vi.fn(),
}));

vi.mock("@/lib/supabase/route-handler-client", () => ({ createRouteHandlerSupabaseClient }));
vi.mock("@/server/services/broker-credentials", () => ({ getMarketDataCredentials }));

import { MarketDataProviderError } from "../server/brokers/provider-error";
import {
  authorizeMarketDataAccount,
  authorizeRealtimeMarketDataSubscription,
} from "../server/services/market-data-access";

const account = {
  id: "account-1",
  owner_user_id: "customer-1",
  broker_provider: "dhan",
  status: "active",
  is_active: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  createRouteHandlerSupabaseClient.mockResolvedValue({ rpc });
  getMarketDataCredentials.mockResolvedValue({ client_id: "server-only-test-value", access_token: "server-only-test-value" });
});

describe("customer market-data account authorization", () => {
  it("authorizes an active account returned by the authenticated account-context RPC", async () => {
    rpc.mockResolvedValue({ data: { account }, error: null });

    const result = await authorizeMarketDataAccount("customer-jwt", "customer-1", "account-1", "dhan");

    expect(createRouteHandlerSupabaseClient).toHaveBeenCalledWith("customer-jwt");
    expect(rpc).toHaveBeenCalledWith("get_active_account_context", { requested_account_id: "account-1" });
    expect(result).toEqual(account);
  });

  it("does not authorize another user's account", async () => {
    rpc.mockResolvedValue({ data: { account: { ...account, owner_user_id: "customer-2" } }, error: null });

    await expect(authorizeMarketDataAccount("customer-jwt", "customer-1", "account-1", "dhan"))
      .rejects.toMatchObject({ code: "ACCOUNT_NOT_FOUND" });
  });

  it("rejects inactive account status and inactive account flags", async () => {
    rpc.mockResolvedValue({ data: { account: { ...account, status: "inactive" } }, error: null });
    await expect(authorizeMarketDataAccount("customer-jwt", "customer-1", "account-1", "dhan"))
      .rejects.toMatchObject({ code: "ACCOUNT_INACTIVE" });

    rpc.mockResolvedValue({ data: { account: { ...account, is_active: false } }, error: null });
    await expect(authorizeMarketDataAccount("customer-jwt", "customer-1", "account-1", "dhan"))
      .rejects.toMatchObject({ code: "ACCOUNT_INACTIVE" });
  });

  it("rejects missing or unauthorized accounts without returning account details", async () => {
    await expect(authorizeMarketDataAccount("customer-jwt", "customer-1", "", "dhan"))
      .rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(rpc).not.toHaveBeenCalled();

    rpc.mockResolvedValue({ data: null, error: new Error("not owned") });
    const error = await authorizeMarketDataAccount("customer-jwt", "customer-1", "missing-account", "dhan")
      .catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(MarketDataProviderError);
    expect((error as Error).message).not.toContain("not owned");
  });

  it("authorizes an active account without an account-level broker association", async () => {
    const { broker_provider: _brokerProvider, ...unassignedAccount } = account;
    rpc.mockResolvedValue({ data: { account: unassignedAccount }, error: null });

    await expect(authorizeMarketDataAccount("customer-jwt", "customer-1", "account-1", "dhan"))
      .resolves.toMatchObject({ id: "account-1", owner_user_id: "customer-1" });

    rpc.mockResolvedValue({ data: { account: { ...unassignedAccount, broker_provider: null } }, error: null });
    await expect(authorizeMarketDataAccount("customer-jwt", "customer-1", "account-1", "kite"))
      .resolves.toMatchObject({ id: "account-1", owner_user_id: "customer-1" });
  });

  it("accepts the canonical Zerodha account provider for the Kite market-data provider", async () => {
    rpc.mockResolvedValue({ data: { account: { ...account, broker_provider: "zerodha" } }, error: null });

    await expect(authorizeMarketDataAccount("customer-jwt", "customer-1", "account-1", "kite"))
      .resolves.toMatchObject({ broker_provider: "zerodha" });
  });

  it("rejects a realtime subscription without an account before credential lookup", async () => {
    await expect(authorizeRealtimeMarketDataSubscription("customer-jwt", "customer-1", {
      account_id: "",
      provider: "dhan",
      environment: "production",
    })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(getMarketDataCredentials).not.toHaveBeenCalled();
  });

  it("rejects an unowned realtime account before credential lookup", async () => {
    rpc.mockResolvedValue({ data: { account: { ...account, owner_user_id: "other-customer" } }, error: null });

    await expect(authorizeRealtimeMarketDataSubscription("customer-jwt", "customer-1", {
      account_id: "account-1",
      provider: "dhan",
      environment: "production",
    })).rejects.toMatchObject({ code: "ACCOUNT_NOT_FOUND" });
    expect(getMarketDataCredentials).not.toHaveBeenCalled();
  });

  it("retrieves realtime credentials only after account authorization with the requested environment", async () => {
    rpc.mockResolvedValue({ data: { account }, error: null });
    getMarketDataCredentials.mockResolvedValueOnce({ client_id: "fake-client", access_token: "fake-access" });

    const result = await authorizeRealtimeMarketDataSubscription("customer-jwt", "customer-1", {
      account_id: "account-1",
      provider: "kite",
      environment: "paper",
    });

    expect(getMarketDataCredentials).toHaveBeenCalledWith("account-1", "kite", "paper");
    expect(result).toMatchObject({
      account: { id: "account-1", owner_user_id: "customer-1" },
      provider: "kite",
      environment: "paper",
      credentials: { client_id: "fake-client", access_token: "fake-access" },
    });
  });

  it("rejects a realtime subscription without an active scoped credential", async () => {
    rpc.mockResolvedValue({ data: { account }, error: null });
    getMarketDataCredentials.mockRejectedValueOnce(new MarketDataProviderError("dhan", "MISSING_CREDENTIALS"));

    await expect(authorizeRealtimeMarketDataSubscription("customer-jwt", "customer-1", {
      account_id: "account-1",
      provider: "dhan",
      environment: "production",
    })).rejects.toMatchObject({ code: "MISSING_CREDENTIALS" });
    expect(getMarketDataCredentials).toHaveBeenCalledWith("account-1", "dhan", "production");
  });
});
