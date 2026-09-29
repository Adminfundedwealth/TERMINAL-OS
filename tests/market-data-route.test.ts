import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedCustomerFromRequest: vi.fn(),
  authorizeMarketDataAccount: vi.fn(),
  createStoredMarketDataProvider: vi.fn(),
  getMarketDataCredentialStatus: vi.fn(),
  recordMarketDataAuthentication: vi.fn(),
  serverLog: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getAuthenticatedCustomerFromRequest: mocks.getAuthenticatedCustomerFromRequest }));
vi.mock("@/server/services/market-data-access", () => ({ authorizeMarketDataAccount: mocks.authorizeMarketDataAccount }));
vi.mock("@/server/brokers/provider-factory", () => ({ createStoredMarketDataProvider: mocks.createStoredMarketDataProvider }));
vi.mock("@/server/services/broker-credentials", () => ({
  getMarketDataCredentialStatus: mocks.getMarketDataCredentialStatus,
  recordMarketDataAuthentication: mocks.recordMarketDataAuthentication,
}));
vi.mock("@/lib/logger", () => ({ serverLog: mocks.serverLog }));

import { GET, OPTIONS, POST } from "../app/api/terminal/market-data/route";
import { MarketDataProviderError } from "../server/brokers/provider-error";

const account = {
  id: "11111111-1111-4111-8111-111111111111",
  owner_user_id: "customer-1",
  broker_provider: "dhan",
  status: "active",
  is_active: true,
};

const provider = {
  authenticate: vi.fn(async () => ({ authenticated: true as const })),
  searchInstruments: vi.fn(async () => [{ provider: "dhan", providerInstrumentId: "13", symbol: "NIFTY" }]),
  getQuote: vi.fn(async () => ({ provider: "dhan", symbol: "NIFTY", ltp: 25000 })),
  getHistoricalCandles: vi.fn(async () => [{ timestamp: "2026-09-28T09:15:00+05:30", open: 100, high: 105, low: 99, close: 103, volume: 10 }]),
};

function post(body: Record<string, unknown>, headers: Record<string, string> = { authorization: "Bearer customer-jwt" }) {
  return new Request("https://terminal.test/api/terminal/market-data", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function responseBody(response: Response) {
  return response.json() as Promise<Record<string, any>>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getAuthenticatedCustomerFromRequest.mockResolvedValue({ userId: "customer-1", accessToken: "customer-jwt" });
  mocks.authorizeMarketDataAccount.mockResolvedValue(account);
  mocks.createStoredMarketDataProvider.mockResolvedValue(provider);
  mocks.getMarketDataCredentialStatus.mockResolvedValue({ configured: true, is_connected: true, last_tested_at: "2026-09-29T00:00:00.000Z", last_test_result: "Authentication successful." });
});

describe("account-scoped market-data API", () => {
  it("allows CORS only for explicitly configured Main Terminal origins", async () => {
    const previousOrigins = process.env.MAIN_TERMINAL_ORIGINS;
    process.env.MAIN_TERMINAL_ORIGINS = "https://main.example.test,https://staging.example.test";
    const allowed = await OPTIONS(new Request("https://terminal.test/api/terminal/market-data", {
      headers: { origin: "https://main.example.test" },
    }));
    const denied = await OPTIONS(new Request("https://terminal.test/api/terminal/market-data", {
      headers: { origin: "https://attacker.example.test" },
    }));
    if (previousOrigins === undefined) delete process.env.MAIN_TERMINAL_ORIGINS;
    else process.env.MAIN_TERMINAL_ORIGINS = previousOrigins;

    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe("https://main.example.test");
    expect(allowed.headers.get("Access-Control-Allow-Headers")).toBe("Authorization, Content-Type");
    expect(denied.status).toBe(403);
  });

  it("rejects requests without Supabase customer authentication", async () => {
    mocks.getAuthenticatedCustomerFromRequest.mockResolvedValue(null);

    const response = await POST(post({ account_id: "11111111-1111-4111-8111-111111111111", provider: "dhan", operation: "authenticate" }));

    expect(response.status).toBe(401);
    expect((await responseBody(response)).error.code).toBe("UNAUTHENTICATED");
    expect(mocks.authorizeMarketDataAccount).not.toHaveBeenCalled();
  });

  it("rejects missing account context", async () => {
    const response = await POST(post({ provider: "dhan", operation: "authenticate" }));

    expect(response.status).toBe(400);
    expect(mocks.createStoredMarketDataProvider).not.toHaveBeenCalled();
  });

  it("rejects another customer's account before provider construction", async () => {
    mocks.authorizeMarketDataAccount.mockRejectedValue(new MarketDataProviderError("dhan", "ACCOUNT_NOT_FOUND"));

    const response = await POST(post({ account_id: "22222222-2222-4222-8222-222222222222", provider: "dhan", operation: "authenticate" }));

    expect(response.status).toBe(403);
    expect(mocks.createStoredMarketDataProvider).not.toHaveBeenCalled();
  });

  it("rejects inactive accounts before provider construction", async () => {
    mocks.authorizeMarketDataAccount.mockRejectedValue(new MarketDataProviderError("dhan", "ACCOUNT_INACTIVE"));

    const response = await POST(post({ account_id: "11111111-1111-4111-8111-111111111111", provider: "dhan", operation: "authenticate" }));

    expect(response.status).toBe(403);
    expect(mocks.createStoredMarketDataProvider).not.toHaveBeenCalled();
  });

  it("rejects a provider that does not match the authorized account", async () => {
    mocks.authorizeMarketDataAccount.mockRejectedValue(new MarketDataProviderError("kite", "INVALID_PROVIDER_ACCOUNT"));

    const response = await POST(post({ account_id: "11111111-1111-4111-8111-111111111111", provider: "kite", operation: "authenticate" }));

    expect(response.status).toBe(409);
    expect(mocks.createStoredMarketDataProvider).not.toHaveBeenCalled();
  });

  it.each([["dhan", "production"], ["kite", "paper"]] as const)("routes authorized %s %s requests to its account/environment provider", async (broker, environment) => {
    const response = await POST(post({ account_id: "11111111-1111-4111-8111-111111111111", provider: broker, environment, operation: "searchInstruments", query: "NIFTY" }));

    expect(response.status).toBe(200);
    expect(mocks.authorizeMarketDataAccount).toHaveBeenCalledWith("customer-jwt", "customer-1", "11111111-1111-4111-8111-111111111111", broker);
    expect(mocks.createStoredMarketDataProvider).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", broker, environment);
    expect((await responseBody(response)).data).toEqual([{ provider: "dhan", providerInstrumentId: "13", symbol: "NIFTY" }]);
  });

  it("returns a normalized safe failure when the active account credential is missing", async () => {
    mocks.createStoredMarketDataProvider.mockRejectedValue(new MarketDataProviderError("dhan", "MISSING_CREDENTIALS"));

    const response = await POST(post({ account_id: "11111111-1111-4111-8111-111111111111", provider: "dhan", operation: "authenticate" }));
    const serialized = JSON.stringify({ body: await responseBody(response), logs: mocks.serverLog.mock.calls });

    expect(response.status).toBe(424);
    expect(serialized).toContain("Broker credentials are not configured.");
    expect(serialized).not.toContain("access-token");
    expect(serialized).not.toContain("api_secret");
  });

  it("returns provider status only for the authorized account/provider pair", async () => {
    const response = await GET(new Request("https://terminal.test/api/terminal/market-data?account_id=11111111-1111-4111-8111-111111111111&provider=dhan&environment=paper", {
      headers: { authorization: "Bearer customer-jwt" },
    }));

    expect(response.status).toBe(200);
    expect(mocks.getMarketDataCredentialStatus).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", "dhan", "paper");
    expect((await responseBody(response)).data).toMatchObject({ account_id: "11111111-1111-4111-8111-111111111111", provider: "dhan", environment: "paper", configured: true, is_connected: true });
  });

  it("does not return or log bearer tokens or broker credential material", async () => {
    const brokerSecret = "never-return-broker-secret";
    mocks.createStoredMarketDataProvider.mockResolvedValue({
      ...provider,
      searchInstruments: vi.fn(async () => { throw new MarketDataProviderError("dhan", "UPSTREAM_ERROR"); }),
    });

    const response = await POST(post({ account_id: "11111111-1111-4111-8111-111111111111", provider: "dhan", operation: "searchInstruments", query: brokerSecret }));
    const serialized = JSON.stringify({ body: await responseBody(response), logs: mocks.serverLog.mock.calls });

    expect(serialized).not.toContain("customer-jwt");
    expect(serialized).not.toContain(brokerSecret);
    expect(serialized).not.toContain("access_token");
    expect(serialized).not.toContain("api_secret");
  });
});
