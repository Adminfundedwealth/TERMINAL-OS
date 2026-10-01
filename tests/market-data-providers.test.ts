import { afterEach, describe, expect, it, vi } from "vitest";
import { DhanMarketDataProvider } from "../server/brokers/dhan";
import { KiteMarketDataProvider } from "../server/brokers/kite";
import { MarketDataProviderError } from "../server/brokers/provider-error";
import type { Fetcher, MarketInstrument } from "../server/brokers/types";

const dhanCredentials = { client_id: "dhan-client-secret", access_token: "dhan-access-secret" };
const kiteCredentials = { api_key: "kite-api-secret", access_token: "kite-access-secret" };

const dhanInstrument: MarketInstrument = {
  provider: "dhan",
  providerInstrumentId: "13",
  symbol: "NIFTY 50",
  tradingSymbol: "NIFTY",
  exchange: "NSE",
  exchangeSegment: "IDX_I",
  instrumentType: "INDEX",
};

const kiteInstrument: MarketInstrument = {
  provider: "kite",
  providerInstrumentId: "256265",
  symbol: "NIFTY 50",
  tradingSymbol: "NIFTY 50",
  exchange: "NSE",
  exchangeSegment: "INDICES",
  instrumentType: "INDEX",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.restoreAllMocks());

describe("Dhan read-only market data provider", () => {
  it("authenticates through the Dhan profile endpoint", async () => {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse({ status: "success", data: { dhanClientId: "masked" } }));
    const provider = new DhanMarketDataProvider(dhanCredentials, fetcher);

    const result = await provider.authenticate();

    expect(String(fetcher.mock.calls[0][0])).toBe("https://api.dhan.co/v2/profile");
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("access-token")).toBe(dhanCredentials.access_token);
    expect(JSON.stringify(result)).not.toContain(dhanCredentials.access_token);
  });

  it("searches the real Dhan scrip master", async () => {
    const csv = [
      "SEM_EXM_EXCH_ID,SEM_SEGMENT,SEM_SMST_SECURITY_ID,SEM_INSTRUMENT_NAME,SEM_EXM_INSTRUMENT_TYPE,SEM_TRADING_SYMBOL,SEM_LOT_UNITS,SEM_TICK_SIZE",
      "NSE,I,13,NIFTY 50,INDEX,NIFTY,1,0.05",
      "NSE,E,25,BANKNIFTY,EQUITY,BANKNIFTY,1,0.05",
    ].join("\n");
    const fetcher = vi.fn<Fetcher>(async () => new Response(csv, { status: 200 }));
    const provider = new DhanMarketDataProvider(dhanCredentials, fetcher);

    const instruments = await provider.searchInstruments("nifty");

    expect(String(fetcher.mock.calls[0][0])).toContain("api-scrip-master.csv");
    expect(instruments).toHaveLength(2);
    expect(instruments[0]).toMatchObject({ provider: "dhan", providerInstrumentId: "13", exchangeSegment: "IDX_I" });
  });

  it("normalizes Dhan quote/LTP data", async () => {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse({ data: { IDX_I: { "13": {
      last_price: 25100, ohlc: { open: 24900, high: 25200, low: 24800, close: 25000 }, volume: 42,
    } } } }));
    const provider = new DhanMarketDataProvider(dhanCredentials, fetcher);

    const quote = await provider.getQuote(dhanInstrument);

    expect(String(fetcher.mock.calls[0][0])).toContain("/marketfeed/ltp");
    expect(quote).toMatchObject({ provider: "dhan", ltp: 25100, previousClose: 25000, change: 100, volume: 42 });
  });

  it("normalizes Dhan historical candles", async () => {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse({ data: {
      timestamp: ["2026-09-28 09:15:00"], open: [100], high: [105], low: [99], close: [103], volume: [900],
    } }));
    const provider = new DhanMarketDataProvider(dhanCredentials, fetcher);

    const candles = await provider.getHistoricalCandles(dhanInstrument, "5m", "2026-09-28", "2026-09-29");

    expect(String(fetcher.mock.calls[0][0])).toContain("/charts/intraday");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ interval: "5", securityId: "13" });
    expect(candles[0]).toMatchObject({ open: 100, high: 105, close: 103, volume: 900 });
  });

  it("normalizes a Dhan option chain through expiry discovery", async () => {
    const fetcher = vi.fn<Fetcher>(async (input) => {
      if (String(input).includes("expirylist")) return jsonResponse({ status: "success", data: ["2026-10-01"] });
      return jsonResponse({ status: "success", data: {
        last_price: 25100,
        oc: { "25000": { ce: { last_price: 150, oi: 500, volume: 20, implied_volatility: 12, greeks: { delta: 0.5 } }, pe: { last_price: 120, oi: 600, volume: 30, implied_volatility: 13 } } },
      } });
    });
    const provider = new DhanMarketDataProvider(dhanCredentials, fetcher);

    const chain = await provider.getOptionChain("NIFTY");

    expect(String(fetcher.mock.calls[0][0])).toContain("expirylist");
    expect(String(fetcher.mock.calls[1][0])).toContain("/optionchain");
    expect(chain).toMatchObject({ provider: "dhan", underlying: "NIFTY", expiry: "2026-10-01", spotPrice: 25100, totalCEOI: 500, totalPEOI: 600, greeksAvailable: true });
    expect(chain.chain[0]).toMatchObject({ strikePrice: 25000, ce: { ltp: 150, oi: 500, delta: 0.5 }, pe: { ltp: 120, oi: 600 } });
  });

  it("rejects unsupported Dhan option underlyings before upstream access", async () => {
    const fetcher = vi.fn<Fetcher>();
    await expect(new DhanMarketDataProvider(dhanCredentials, fetcher).getOptionChain("RELIANCE"))
      .rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails closed on missing or invalid credentials and redacts upstream bodies", async () => {
    expect(() => new DhanMarketDataProvider({ client_id: "only-client" }, vi.fn<Fetcher>())).toThrowError(
      expect.objectContaining({ code: "MISSING_CREDENTIALS" })
    );
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse({ message: "dhan-access-secret rejected" }, 401));
    const provider = new DhanMarketDataProvider(dhanCredentials, fetcher);

    const error: unknown = await provider.authenticate().catch((failure: unknown) => failure);
    expect(error).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect((error as Error).message).not.toContain(dhanCredentials.access_token);
  });

  it("sanitizes Dhan upstream server errors", async () => {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse({ message: "contains-secret" }, 503));
    const provider = new DhanMarketDataProvider(dhanCredentials, fetcher);

    await expect(provider.getQuote(dhanInstrument)).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
  });
});

describe("Kite read-only market data provider", () => {
  it("authenticates through Kite's user profile endpoint", async () => {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse({ status: "success", data: { user_id: "test" } }));
    const provider = new KiteMarketDataProvider(kiteCredentials, fetcher);

    const result = await provider.authenticate();

    expect(String(fetcher.mock.calls[0][0])).toBe("https://api.kite.trade/user/profile");
    expect(new Headers(fetcher.mock.calls[0][1]?.headers).get("Authorization")).toBe("token kite-api-secret:kite-access-secret");
    expect(JSON.stringify(result)).not.toContain(kiteCredentials.access_token);
  });

  it("searches the authenticated Kite instrument master", async () => {
    const csv = [
      "instrument_token,exchange_token,tradingsymbol,name,last_price,expiry,strike,tick_size,lot_size,instrument_type,segment,exchange",
      "256265,0,NIFTY 50,NIFTY 50,0,,,,1,INDEX,INDICES,NSE",
      "738561,0,RELIANCE,RELIANCE,0,,,,1,EQ,NSE,NSE",
    ].join("\n");
    const fetcher = vi.fn<Fetcher>(async () => new Response(csv, { status: 200 }));
    const provider = new KiteMarketDataProvider(kiteCredentials, fetcher);

    const instruments = await provider.searchInstruments("nifty");

    expect(String(fetcher.mock.calls[0][0])).toBe("https://api.kite.trade/instruments");
    expect(instruments).toHaveLength(1);
    expect(instruments[0]).toMatchObject({ provider: "kite", providerInstrumentId: "256265", exchange: "NSE" });
  });

  it("normalizes Kite quote/LTP data", async () => {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse({ status: "success", data: { "NSE:NIFTY 50": {
      last_price: 25100, timestamp: "2026-09-29 10:00:00", volume: 10,
      ohlc: { open: 25000, high: 25200, low: 24900, close: 25000 },
    } } }));
    const provider = new KiteMarketDataProvider(kiteCredentials, fetcher);

    const quote = await provider.getQuote(kiteInstrument);

    expect(String(fetcher.mock.calls[0][0])).toContain("/quote?");
    expect(quote).toMatchObject({ provider: "kite", ltp: 25100, previousClose: 25000, change: 100 });
  });

  it("normalizes Kite historical candles", async () => {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse({ status: "success", data: {
      candles: [["2026-09-28T09:15:00+0530", 100, 105, 99, 103, 900]],
    } }));
    const provider = new KiteMarketDataProvider(kiteCredentials, fetcher);

    const candles = await provider.getHistoricalCandles(kiteInstrument, "5minute", "2026-09-28", "2026-09-29");

    expect(String(fetcher.mock.calls[0][0])).toContain("/instruments/historical/256265/5minute");
    expect(candles[0]).toMatchObject({ open: 100, high: 105, close: 103, volume: 900 });
  });

  it("fails closed on missing or invalid credentials and redacts upstream bodies", async () => {
    expect(() => new KiteMarketDataProvider({ api_key: "only-key" }, vi.fn<Fetcher>())).toThrowError(
      expect.objectContaining({ code: "MISSING_CREDENTIALS" })
    );
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse({ message: "kite-access-secret rejected" }, 403));
    const provider = new KiteMarketDataProvider(kiteCredentials, fetcher);

    const error: unknown = await provider.authenticate().catch((failure: unknown) => failure);
    expect(error).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect((error as Error).message).not.toContain(kiteCredentials.access_token);
  });

  it("sanitizes Kite upstream server errors", async () => {
    const fetcher = vi.fn<Fetcher>(async () => jsonResponse({ message: "contains-secret" }, 503));
    const provider = new KiteMarketDataProvider(kiteCredentials, fetcher);

    await expect(provider.searchInstruments("NIFTY")).rejects.toMatchObject({ code: "UPSTREAM_ERROR" });
  });
});

describe("provider isolation", () => {
  it("rejects instruments belonging to the other broker without making upstream calls", async () => {
    const dhanFetch = vi.fn<Fetcher>();
    const kiteFetch = vi.fn<Fetcher>();

    await expect(new DhanMarketDataProvider(dhanCredentials, dhanFetch).getQuote(kiteInstrument))
      .rejects.toBeInstanceOf(MarketDataProviderError);
    await expect(new KiteMarketDataProvider(kiteCredentials, kiteFetch).getQuote(dhanInstrument))
      .rejects.toBeInstanceOf(MarketDataProviderError);

    expect(dhanFetch).not.toHaveBeenCalled();
    expect(kiteFetch).not.toHaveBeenCalled();
  });

  it("sends each provider's credentials only to its own upstream", async () => {
    const dhanFetch = vi.fn<Fetcher>(async () => jsonResponse({ status: "success", data: {} }));
    const kiteFetch = vi.fn<Fetcher>(async () => jsonResponse({ status: "success", data: {} }));

    await new DhanMarketDataProvider(dhanCredentials, dhanFetch).authenticate();
    await new KiteMarketDataProvider(kiteCredentials, kiteFetch).authenticate();

    expect(String(dhanFetch.mock.calls[0][0])).toContain("api.dhan.co");
    expect(String(kiteFetch.mock.calls[0][0])).toContain("api.kite.trade");
    expect(new Headers(dhanFetch.mock.calls[0][1]?.headers).get("Authorization")).toBeNull();
    expect(new Headers(kiteFetch.mock.calls[0][1]?.headers).get("access-token")).toBeNull();
  });
});