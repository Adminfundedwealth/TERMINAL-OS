import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedCustomerFromRequest: vi.fn(),
  authorizeMarketDataAccount: vi.fn(),
  createStoredMarketDataProvider: vi.fn(),
  serverLog: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getAuthenticatedCustomerFromRequest: mocks.getAuthenticatedCustomerFromRequest }));
vi.mock("@/server/services/market-data-access", () => ({ authorizeMarketDataAccount: mocks.authorizeMarketDataAccount }));
vi.mock("@/server/brokers/provider-factory", () => ({ createStoredMarketDataProvider: mocks.createStoredMarketDataProvider }));
vi.mock("@/lib/logger", () => ({ serverLog: mocks.serverLog }));

import { GET } from "../app/api/terminal/market-data/stream/route";

const accountId = "11111111-1111-4111-8111-111111111111";
const provider = {
  searchInstruments: vi.fn(async (symbol: string) => [{
    provider: "kite" as const,
    providerInstrumentId: symbol === "NIFTY" ? "256265" : "260105",
    symbol,
    tradingSymbol: symbol,
    exchange: "NSE",
    exchangeSegment: "INDICES",
    instrumentType: "INDEX",
  }]),
  getQuote: vi.fn(async (instrument: { symbol: string }) => ({
    provider: "kite" as const,
    symbol: instrument.symbol,
    tradingSymbol: instrument.symbol,
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
    timestamp: "2026-10-01T09:15:00.000Z",
  })),
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MAIN_TERMINAL_ORIGINS = "https://charts.fundedwealth.com";
  mocks.getAuthenticatedCustomerFromRequest.mockResolvedValue({ userId: "customer-1", accessToken: "mock-jwt" });
  mocks.authorizeMarketDataAccount.mockResolvedValue({ id: accountId, owner_user_id: "customer-1", status: "active", is_active: true });
  mocks.createStoredMarketDataProvider.mockResolvedValue(provider);
});

describe("account-scoped realtime stream", () => {
  it("authorizes the account and streams normalized quotes from the provider adapter boundary", async () => {
    const controller = new AbortController();
    const request = new Request(`https://terminal.test/api/terminal/market-data/stream?account_id=${accountId}&provider=kite&environment=paper&symbols=NIFTY,BANKNIFTY`, {
      headers: { authorization: "Bearer mock-jwt", origin: "https://charts.fundedwealth.com" },
      signal: controller.signal,
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("access-control-allow-origin")).toBe("https://charts.fundedwealth.com");
    expect(mocks.authorizeMarketDataAccount).toHaveBeenCalledWith("mock-jwt", "customer-1", accountId, "kite");
    expect(mocks.createStoredMarketDataProvider).toHaveBeenCalledWith(accountId, "kite", "paper");

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let body = "";
    while (!body.includes('"symbol":"NIFTY"') || !body.includes('"symbol":"BANKNIFTY"')) {
      const { value, done } = await reader.read();
      if (done) break;
      body += decoder.decode(value, { stream: true });
    }
    controller.abort();
    await reader.cancel().catch(() => undefined);

    expect(body).toContain("event: ready");
    expect(body).toContain("event: quote");
    expect(body).toContain('"account_id":"' + accountId + '"');
    expect(body).toContain('"provider":"kite"');
    expect(body).toContain('"ltp":25000');
    expect(provider.getQuote).toHaveBeenCalledTimes(2);
  });

  it("rejects requests without customer JWT before constructing a provider", async () => {
    mocks.getAuthenticatedCustomerFromRequest.mockResolvedValueOnce(null);
    const request = new Request(`https://terminal.test/api/terminal/market-data/stream?account_id=${accountId}&provider=kite&symbols=NIFTY`);

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(mocks.authorizeMarketDataAccount).not.toHaveBeenCalled();
    expect(mocks.createStoredMarketDataProvider).not.toHaveBeenCalled();
  });
});
