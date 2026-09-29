import { beforeEach, describe, expect, it, vi } from "vitest";

const { createRouteHandlerSupabaseClient, rpc } = vi.hoisted(() => ({
  createRouteHandlerSupabaseClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/route-handler-client", () => ({ createRouteHandlerSupabaseClient }));

import { MarketDataProviderError } from "../server/brokers/provider-error";
import { authorizeMarketDataAccount } from "../server/services/market-data-access";

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

  it("rejects provider/account mismatches, including Kite on a Dhan account", async () => {
    rpc.mockResolvedValue({ data: { account }, error: null });

    await expect(authorizeMarketDataAccount("customer-jwt", "customer-1", "account-1", "kite"))
      .rejects.toMatchObject({ code: "INVALID_PROVIDER_ACCOUNT" });
  });

  it("accepts the canonical Zerodha account provider for the Kite market-data provider", async () => {
    rpc.mockResolvedValue({ data: { account: { ...account, broker_provider: "zerodha" } }, error: null });

    await expect(authorizeMarketDataAccount("customer-jwt", "customer-1", "account-1", "kite"))
      .resolves.toMatchObject({ broker_provider: "zerodha" });
  });
});
