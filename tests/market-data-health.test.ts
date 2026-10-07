import { describe, expect, it, vi } from "vitest";

const { createServerSupabaseClient } = vi.hoisted(() => ({ createServerSupabaseClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient }));

import { createServerSupabaseClient as mockedCreateServerSupabaseClient } from "@/lib/supabase/server";
import { getMarketDataHealth, normalizeTradingViewScan } from "../server/services/market-data-health";

function createQuery(data: unknown) {
  const query: Record<string, (...args: any[]) => any> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => ({ data, error: null }));
  return query;
}

describe("Terminal OS market-data health checks", () => {
  it("normalizes TradingView scanner rows into the shared quote fields", () => {
    const quotes = normalizeTradingViewScan({
      data: [{ s: "NSE:RELIANCE", d: ["RELIANCE", "Reliance Industries", 1250, 2.5, 30, 1000, 1200, 1260, 1190, "Energy"] }],
    }, "2026-09-30T00:00:00.000Z");

    expect(quotes).toEqual([{
      provider: "tradingview",
      symbol: "RELIANCE",
      display_name: "Reliance Industries",
      exchange: "NSE",
      segment: "NSE_EQ",
      instrument_token: "NSE:RELIANCE",
      ltp: 1250,
      change: 30,
      change_percent: 2.5,
      bid: null,
      ask: null,
      volume: 1000,
      timestamp: "2026-09-30T00:00:00.000Z",
    }]);
  });

  it("performs real NSE and TradingView requests and reports the stored Dhan failure without retrying", async () => {
    const accountQuery = createQuery({ id: "account-1", status: "active", is_active: true });
    const credentialQuery = createQuery({
      is_active: false,
      is_connected: false,
      last_tested_at: "2026-09-29T20:30:32.378Z",
      last_test_result: "Broker authentication failed.",
    });
    const db = {
      from: vi.fn((table: string) => table === "trading_accounts"
        ? accountQuery
        : credentialQuery),
      rpc: vi.fn(),
    };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url === "https://www.nseindia.com/") {
        return new Response("<html></html>", { status: 200, headers: { "set-cookie": "nse-session=ok; Path=/" } });
      }
      if (url === "https://www.nseindia.com/api/allIndices") {
        return new Response(JSON.stringify({ data: [{ index: "NIFTY 50" }] }), { status: 200 });
      }
      if (url === "https://scanner.tradingview.com/india/scan") {
        return new Response(JSON.stringify({
          data: [{ s: "NSE:RELIANCE", d: ["RELIANCE", "Reliance Industries", 1250, 2.5, 30, 1000, 1200, 1260, 1190, "Energy"] }],
        }), { status: 200 });
      }
      return new Response("", { status: 404 });
    });

    const health = await getMarketDataHealth("account-1", fetcher);

    expect(health.data.map(({ id, status }) => [id, status])).toEqual([
      ["terminal_api", "ONLINE"],
      ["nse", "ONLINE"],
      ["tradingview", "ONLINE"],
      ["dhan", "ERROR"],
      ["dhan_websocket", "NOT_IMPLEMENTED"],
    ]);
    expect(health.data.find((check) => check.id === "dhan")?.detail)
      .toBe("Most recent Dhan authentication test failed.");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.map(([url]) => String(url)).sort()).toEqual([
      "https://www.nseindia.com/",
      "https://www.nseindia.com/api/allIndices",
      "https://scanner.tradingview.com/india/scan",
    ].sort());
    expect(db.from).toHaveBeenCalledWith("broker_credentials");
    expect(credentialQuery.select).toHaveBeenCalledWith("is_active,is_connected,last_tested_at,last_test_result");
    expect(credentialQuery.eq).toHaveBeenCalledWith("trading_account_id", "account-1");
    expect(JSON.stringify(health)).not.toContain("encrypted_credentials");
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("reports Dhan online from an active tested credential", async () => {
    const credentialQuery = createQuery({
      is_active: true,
      is_connected: true,
      last_tested_at: "2026-10-07T03:51:04.408Z",
      last_test_result: "Authentication successful.",
    });
    const db = {
      from: vi.fn(() => credentialQuery),
      rpc: vi.fn(),
    };
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue(db as never);

    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url === "https://www.nseindia.com/") return new Response("<html></html>", { status: 200 });
      if (url === "https://www.nseindia.com/api/allIndices") {
        return new Response(JSON.stringify({ data: [{ index: "NIFTY 50" }] }), { status: 200 });
      }
      if (url === "https://scanner.tradingview.com/india/scan") {
        return new Response(JSON.stringify({
          data: [{ s: "NSE:RELIANCE", d: ["RELIANCE", "Reliance Industries", 1250, 2.5, 30, 1000, 1200, 1260, 1190, "Energy"] }],
        }), { status: 200 });
      }
      return new Response("", { status: 404 });
    });

    const health = await getMarketDataHealth(null, fetcher);

    expect(health.data.find((check) => check.id === "dhan"))
      .toMatchObject({ status: "ONLINE", detail: "Most recent Dhan authentication test succeeded." });
    expect(credentialQuery.eq).toHaveBeenCalledWith("broker_id", "dhan");
    expect(credentialQuery.eq).toHaveBeenCalledWith("environment", "production");
    expect(credentialQuery.eq).toHaveBeenCalledWith("is_active", true);
    expect(credentialQuery.limit).toHaveBeenCalledWith(1);
  });

  it("does not report NSE online when the real data request fails", async () => {
    vi.mocked(mockedCreateServerSupabaseClient).mockReturnValue({ from: vi.fn() } as never);
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url === "https://www.nseindia.com/") return new Response("<html></html>", { status: 200 });
      if (url === "https://www.nseindia.com/api/allIndices") return new Response("", { status: 503 });
      if (url === "https://scanner.tradingview.com/india/scan") return new Response(JSON.stringify({ data: [] }), { status: 200 });
      return new Response("", { status: 404 });
    });

    const health = await getMarketDataHealth(null, fetcher);

    expect(health.data.find((check) => check.id === "nse")?.status).toBe("OFFLINE");
    expect(health.data.find((check) => check.id === "tradingview")?.status).toBe("ERROR");
    expect(health.data.find((check) => check.id === "dhan")?.status).toBe("ERROR");
    expect(health.data.find((check) => check.id === "dhan_websocket")?.status).toBe("NOT_IMPLEMENTED");
  });
});