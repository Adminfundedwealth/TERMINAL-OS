import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedCustomerFromRequest: vi.fn(),
  authorizeMarketDataAccount: vi.fn(),
  issueRealtimeTicket: vi.fn(),
  verifyRealtimeTicket: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  getMarketDataCredentials: vi.fn(),
  getActiveCentralMarketDataCredentials: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthenticatedCustomerFromRequest: mocks.getAuthenticatedCustomerFromRequest,
}));
vi.mock("@/server/services/market-data-access", () => ({
  authorizeMarketDataAccount: mocks.authorizeMarketDataAccount,
}));
vi.mock("@/server/brokers/realtime-ticket", () => ({
  issueRealtimeTicket: mocks.issueRealtimeTicket,
  verifyRealtimeTicket: mocks.verifyRealtimeTicket,
}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));
vi.mock("@/server/services/broker-credentials", () => ({
  getMarketDataCredentials: mocks.getMarketDataCredentials,
}));
vi.mock("@/server/services/broker-connections", () => ({
  getActiveCentralMarketDataCredentials: mocks.getActiveCentralMarketDataCredentials,
}));

import { POST } from "../app/api/terminal/realtime-ticket/route";
import { POST as reauthorize } from "../app/api/terminal/realtime-reauthorize/route";

const customer = { userId: "11111111-1111-4111-8111-111111111111", accessToken: "customer-jwt" };

function request(body: Record<string, unknown>) {
  return new Request("https://terminal.test/api/terminal/realtime-ticket", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer customer-jwt" },
    body: JSON.stringify(body),
  });
}

describe("global Dhan realtime ticket API", () => {
  const previousTicketSecret = process.env.REALTIME_TICKET_SECRET;
  const previousServiceSecret = process.env.REALTIME_SERVICE_AUTH_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REALTIME_TICKET_SECRET = "local-test-realtime-ticket-secret";
    process.env.REALTIME_SERVICE_AUTH_SECRET = "local-test-realtime-service-secret";
    mocks.getAuthenticatedCustomerFromRequest.mockResolvedValue(customer);
    mocks.authorizeMarketDataAccount.mockResolvedValue(undefined);
    mocks.issueRealtimeTicket.mockReturnValue({
      ticket: "signed-global-ticket",
      claims: { exp: 1_800_000_090 },
    });
    mocks.verifyRealtimeTicket.mockReturnValue({
      sub: customer.userId,
      account_id: null,
      provider: "dhan",
      environment: "production",
      exp: 1_800_000_090,
    });
    mocks.getActiveCentralMarketDataCredentials.mockResolvedValue({ access_token: "server-only-dhan-token" });
  });

  it("issues a Dhan ticket without requiring or authorizing a trading account", async () => {
    const response = await POST(request({ provider: "dhan", environment: "production" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.authorizeMarketDataAccount).not.toHaveBeenCalled();
    expect(mocks.issueRealtimeTicket).toHaveBeenCalledWith({
      sub: customer.userId,
      account_id: null,
      provider: "dhan",
      environment: "production",
    }, process.env.REALTIME_TICKET_SECRET);
    expect(body.data.ticket).toBe("signed-global-ticket");
  });

  it("still requires an account for Kite realtime tickets", async () => {
    const response = await POST(request({ provider: "kite", environment: "production" }));

    expect(response.status).toBe(400);
    expect(mocks.authorizeMarketDataAccount).not.toHaveBeenCalled();
    expect(mocks.issueRealtimeTicket).not.toHaveBeenCalled();
  });

  it("reauthorizes global Dhan tickets through the active central credential without an account lookup", async () => {
    const response = await reauthorize(new Request("https://terminal.test/api/terminal/realtime-reauthorize", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.REALTIME_SERVICE_AUTH_SECRET}`,
      },
      body: JSON.stringify({ ticket: "signed-global-ticket" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authorized).toBe(true);
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
    expect(mocks.getActiveCentralMarketDataCredentials).toHaveBeenCalledWith({
      broker_id: "dhan",
      environment: "production",
    });
  });

  afterEach(() => {
    if (previousTicketSecret === undefined) delete process.env.REALTIME_TICKET_SECRET;
    else process.env.REALTIME_TICKET_SECRET = previousTicketSecret;
    if (previousServiceSecret === undefined) delete process.env.REALTIME_SERVICE_AUTH_SECRET;
    else process.env.REALTIME_SERVICE_AUTH_SECRET = previousServiceSecret;
  });
});
