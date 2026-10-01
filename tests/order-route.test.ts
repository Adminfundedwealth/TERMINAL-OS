import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedCustomerFromRequest: vi.fn(),
  createRouteHandlerSupabaseClient: vi.fn(),
  serverLog: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getAuthenticatedCustomerFromRequest: mocks.getAuthenticatedCustomerFromRequest }));
vi.mock("@/lib/supabase/route-handler-client", () => ({ createRouteHandlerSupabaseClient: mocks.createRouteHandlerSupabaseClient }));
vi.mock("@/lib/logger", () => ({ serverLog: mocks.serverLog }));

import { OPTIONS, POST } from "../app/api/terminal/orders/route";

const accountId = "11111111-1111-4111-8111-111111111111";
const account = { id: accountId, owner_user_id: "customer-1", status: "active", is_active: true };
const orderRequest = {
  account_id: accountId,
  client_order_id: "safe-order-test-1",
  symbol: "TEST",
  exchange: "NSE",
  segment: "NSE_EQ",
  side: "BUY",
  quantity: 1,
  order_type: "LIMIT",
  price: 100,
  product: "CNC",
};

function post(body: unknown, headers: Record<string, string> = { authorization: "Bearer test-customer-jwt" }) {
  return new Request("https://terminal.test/api/terminal/orders", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MAIN_TERMINAL_ORIGINS = "https://charts.fundedwealth.com";
  mocks.getAuthenticatedCustomerFromRequest.mockResolvedValue({ userId: "customer-1", accessToken: "test-customer-jwt" });
  mocks.createRouteHandlerSupabaseClient.mockResolvedValue({ rpc: mocks.rpc });
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === "get_active_account_context") return { data: { account }, error: null };
    return { data: { ok: true, replayed: false, order: { id: "mock-order" }, execution: { id: "mock-execution" }, position: { id: "mock-position" } }, error: null };
  });
});

describe("customer order gateway", () => {
  it("rejects unauthenticated requests before Supabase or order RPC access", async () => {
    mocks.getAuthenticatedCustomerFromRequest.mockResolvedValueOnce(null);

    const response = await POST(post(orderRequest));

    expect(response.status).toBe(401);
    expect(mocks.createRouteHandlerSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("validates and authorizes the requested active account before calling the risk-gated order RPC", async () => {
    const response = await POST(post(orderRequest));

    expect(response.status).toBe(200);
    expect(mocks.getAuthenticatedCustomerFromRequest).toHaveBeenCalled();
    expect(mocks.createRouteHandlerSupabaseClient).toHaveBeenCalledWith("test-customer-jwt");
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "get_active_account_context", { requested_account_id: accountId });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "create_order", { request: orderRequest });
    expect(await response.json()).toMatchObject({ data: { ok: true, order: { id: "mock-order" } } });
  });

  it("rejects another owner's or an inactive account before order creation", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { account: { ...account, owner_user_id: "other-customer" } }, error: null });

    const response = await POST(post(orderRequest));

    expect(response.status).toBe(403);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("preserves the database risk rejection without attempting provider execution", async () => {
    mocks.rpc.mockImplementation(async (name: string) => name === "get_active_account_context"
      ? { data: { account }, error: null }
      : { data: { ok: false, error: { code: "DAILY_LOSS_LIMIT", message: "Risk rejected" } }, error: null });

    const response = await POST(post(orderRequest));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "DAILY_LOSS_LIMIT" } });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it("routes Kite derivative requests only to the simulated execution RPC", async () => {
    const simulatedRequest = {
      ...orderRequest,
      symbol: "NIFTY-TEST-CE",
      segment: "NSE_FNO",
      quantity: 50,
      product: "NRML",
      instrument: { provider: "zerodha", instrumentType: "OPTIDX", providerInstrumentId: "123", lotSize: 50 },
    };

    const response = await POST(post(simulatedRequest));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "create_simulated_kite_order", { request: simulatedRequest });
  });

  it("allows production Main Terminal preflight for the order route", async () => {
    const response = await OPTIONS(new Request("https://terminal.test/api/terminal/orders", {
      method: "OPTIONS",
      headers: {
        origin: "https://charts.fundedwealth.com",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://charts.fundedwealth.com");
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });
});
