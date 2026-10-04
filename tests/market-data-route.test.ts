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
  searchInstruments: vi.fn(async () => [{
    provider: "dhan" as "dhan" | "kite",
    providerInstrumentId: "13",
    symbol: "NIFTY",
    tradingSymbol: "NIFTY 50",
    exchange: "NSE",
    exchangeSegment: "IDX_I",
    instrumentType: "INDEX",
  }]),
  getQuote: vi.fn(async () => ({
    provider: "dhan" as "dhan" | "kite",
    symbol: "NIFTY",
    tradingSymbol: "NIFTY 50",
    exchange: "NSE",
    ltp: 25000,
    open: 24900,
    high: 25100,
    low: 24800,
    previousClose: 24950,
    change: 50,
    changePercent: 0.2,
    volume: 10,
    openInterest: null,
    timestamp: "2026-09-30T00:00:00.000Z",
  })),
  getHistoricalCandles: vi.fn(async () => [{ timestamp: "2026-09-28T09:15:00+05:30", open: 100, high: 105, low: 99, close: 103, volume: 10 }]),
  getOptionChain: vi.fn(async () => ({
    provider: "dhan" as "dhan" | "kite",
    underlying: "NIFTY",
    expiry: "2026-10-01",
    expiries: ["2026-10-01"],
    spot_price: 25000,
    spotPrice: 25000,
    chain: [{
      underlying: "NIFTY",
      expiry: "2026-10-01",
      strike: 25000,
      call: { ltp: 100, bid: 99, ask: 101, volume: 10, oi: 20, change: 1, change_percent: 1, iv: 12, oi_change: 2, greeks: null },
      put: null,
      timestamp: "2026-09-30T00:00:00.000Z",
      strikePrice: 25000,
      ce: { ltp: 100, oi: 20, oiChange: 2, volume: 10, iv: 12, delta: 0, gamma: 0, theta: 0, vega: 0, bidPrice: 99, askPrice: 101 },
      pe: { ltp: 0, oi: 0, oiChange: 0, volume: 0, iv: 0, delta: 0, gamma: 0, theta: 0, vega: 0, bidPrice: 0, askPrice: 0 },
    }],
    total_call_oi: 20,
    total_put_oi: 0,
    totalCEOI: 20,
    totalPEOI: 0,
    greeks_available: false,
    greeksAvailable: false,
    depth_available: true,
    timestamp: "2026-09-30T00:00:00.000Z",
    source: "broker" as const,
  })),
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

  it.each([["dhan", "production"], ["kite", "paper"]] as const)("routes authorized %s %s requests to its account/environment provider", async (broker: "dhan" | "kite", environment: "production" | "paper") => {
    provider.searchInstruments.mockResolvedValueOnce([{
      provider: broker,
      providerInstrumentId: "13",
      symbol: "NIFTY",
      tradingSymbol: "NIFTY 50",
      exchange: "NSE",
      exchangeSegment: "IDX_I",
      instrumentType: "INDEX",
    }]);
    const response = await POST(post({ account_id: "11111111-1111-4111-8111-111111111111", provider: broker, environment, operation: "searchInstruments", query: "NIFTY" }));

    expect(response.status).toBe(200);
    expect(mocks.authorizeMarketDataAccount).toHaveBeenCalledWith("customer-jwt", "customer-1", "11111111-1111-4111-8111-111111111111", broker);
    expect(mocks.createStoredMarketDataProvider).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", broker, environment);
    expect((await responseBody(response)).data).toEqual([{
      provider: broker,
      providerInstrumentId: "13",
      symbol: "NIFTY",
      tradingSymbol: "NIFTY 50",
      exchange: "NSE",
      exchangeSegment: "IDX_I",
      instrumentType: "INDEX",
      display_name: "NIFTY 50",
      segment: "IDX_I",
      instrument_token: "13",
    }]);
  });

  it("rejects adapter instruments whose provider differs from the requested provider", async () => {
    mocks.createStoredMarketDataProvider.mockResolvedValue({
      ...provider,
      searchInstruments: vi.fn(async () => [{
        provider: "kite",
        providerInstrumentId: "256265",
        symbol: "NIFTY",
        tradingSymbol: "NIFTY 50",
        exchange: "NSE",
        exchangeSegment: "INDICES",
        instrumentType: "INDEX",
      }]),
    });

    const response = await POST(post({
      account_id: account.id,
      provider: "dhan",
      operation: "searchInstruments",
      query: "NIFTY",
    }));

    expect(response.status).toBe(400);
    expect((await responseBody(response)).error.code).toBe("INVALID_INSTRUMENT");
  });

  it("returns stable quote and candle fields while retaining legacy camelCase quote aliases", async () => {
    const instrument = {
      provider: "dhan",
      providerInstrumentId: "13",
      symbol: "NIFTY",
      tradingSymbol: "NIFTY 50",
      exchange: "NSE",
      exchangeSegment: "IDX_I",
      instrumentType: "INDEX",
    };
    const quoteResponse = await POST(post({ account_id: account.id, provider: "dhan", operation: "getQuote", instrument }));
    expect((await responseBody(quoteResponse)).data).toMatchObject({
      symbol: "NIFTY",
      ltp: 25000,
      change: 50,
      changePercent: 0.2,
      change_percent: 0.2,
      bid: null,
      ask: null,
      volume: 10,
      timestamp: "2026-09-30T00:00:00.000Z",
    });

    const candleResponse = await POST(post({
      account_id: account.id,
      provider: "dhan",
      operation: "getHistoricalCandles",
      instrument,
      interval: "5m",
      fromDate: "2026-09-29",
      toDate: "2026-09-30",
    }));
    expect((await responseBody(candleResponse)).data).toEqual([
      { timestamp: "2026-09-28T09:15:00+05:30", open: 100, high: 105, low: 99, close: 103, volume: 10 },
    ]);
  });

  it("routes account-scoped option-chain requests through the selected provider and preserves the normalized chain contract", async () => {
    const response = await POST(post({
      account_id: account.id,
      provider: "dhan",
      environment: "production",
      operation: "getOptionChain",
      underlying: "NIFTY",
      expiry: "2026-10-01",
    }));

    expect(response.status).toBe(200);
    expect(mocks.authorizeMarketDataAccount).toHaveBeenCalledWith("customer-jwt", "customer-1", account.id, "dhan");
    expect(mocks.createStoredMarketDataProvider).toHaveBeenCalledWith(account.id, "dhan", "production");
    expect(mocks.createStoredMarketDataProvider.mock.results[0].value).toBeDefined();
    expect((await responseBody(response)).data).toMatchObject({
      provider: "dhan",
      underlying: "NIFTY",
      expiry: "2026-10-01",
      chain: [{ strike: 25000, call: { ltp: 100 }, put: null, strikePrice: 25000 }],
    });
  });

  it("rejects an option-chain response from a different provider", async () => {
    mocks.createStoredMarketDataProvider.mockResolvedValue({
      ...provider,
      getOptionChain: vi.fn(async () => ({ provider: "kite", underlying: "NIFTY" })),
    });

    const response = await POST(post({
      account_id: account.id,
      provider: "dhan",
      operation: "getOptionChain",
      underlying: "NIFTY",
      expiry: "2026-10-01",
    }));

    expect(response.status).toBe(400);
    expect((await responseBody(response)).error.code).toBe("INVALID_INSTRUMENT");
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
