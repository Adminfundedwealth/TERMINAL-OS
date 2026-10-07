import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Fetcher } from "@/server/brokers/types";

export type MarketDataHealthStatus = "ONLINE" | "OFFLINE" | "ERROR" | "NOT_IMPLEMENTED";

export interface MarketDataHealthCheck {
  id: "terminal_api" | "nse" | "tradingview" | "dhan" | "dhan_websocket";
  status: MarketDataHealthStatus;
  checked_at: string;
  response_time_ms: number | null;
  detail: string;
  sample_count?: number;
}

export interface TradingViewQuote {
  provider: "tradingview";
  symbol: string;
  display_name: string;
  exchange: string;
  segment: string;
  instrument_token: string;
  ltp: number;
  change: number;
  change_percent: number;
  bid: number | null;
  ask: number | null;
  volume: number;
  timestamp: string;
}

const NSE_HOME = "https://www.nseindia.com/";
const NSE_INDICES = "https://www.nseindia.com/api/allIndices";
const TRADINGVIEW_SCAN = "https://scanner.tradingview.com/india/scan";
const TRADINGVIEW_COLUMNS = [
  "name", "description", "close", "change", "change_abs", "volume",
  "open", "high", "low", "sector",
];
const TRADINGVIEW_TICKERS = ["NSE:RELIANCE", "NSE:TCS", "NSE:HDFCBANK"];
const NSE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: NSE_HOME,
};

function result(
  id: MarketDataHealthCheck["id"],
  status: MarketDataHealthStatus,
  started: number,
  detail: string,
  sampleCount?: number,
): MarketDataHealthCheck {
  return {
    id,
    status,
    checked_at: new Date().toISOString(),
    response_time_ms: Date.now() - started,
    detail,
    ...(sampleCount === undefined ? {} : { sample_count: sampleCount }),
  };
}

function safeFailure(error: unknown, service: string): string {
  if (error instanceof Error && /HTTP \d{3}/.test(error.message)) {
    return `${service} request failed (${error.message.match(/HTTP \d{3}/)?.[0]}).`;
  }
  if (error instanceof Error && /abort|timeout/i.test(error.message)) {
    return `${service} request timed out.`;
  }
  return `${service} is unavailable.`;
}

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeTradingViewScan(payload: unknown, now = new Date().toISOString()): TradingViewQuote[] {
  if (!payload || typeof payload !== "object") return [];
  const rows = (payload as { data?: unknown }).data;
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row): TradingViewQuote[] => {
    if (!row || typeof row !== "object") return [];
    const entry = row as { s?: unknown; d?: unknown };
    if (typeof entry.s !== "string" || !Array.isArray(entry.d)) return [];
    const values = entry.d;
    const [exchange, symbol] = entry.s.split(":");
    const ltp = finiteNumber(values[2]);
    if (!symbol || ltp === null || ltp <= 0) return [];
    return [{
      provider: "tradingview",
      symbol,
      display_name: typeof values[1] === "string" ? values[1] : symbol,
      exchange: exchange || "NSE",
      segment: "NSE_EQ",
      instrument_token: entry.s,
      ltp,
      change: finiteNumber(values[4]) ?? 0,
      change_percent: finiteNumber(values[3]) ?? 0,
      bid: null,
      ask: null,
      volume: finiteNumber(values[5]) ?? 0,
      timestamp: now,
    }];
  });
}

async function checkNse(fetcher: Fetcher): Promise<MarketDataHealthCheck> {
  const started = Date.now();
  try {
    const bootstrap = await fetcher(NSE_HOME, {
      headers: { ...NSE_HEADERS, Accept: "text/html,application/xhtml+xml" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!bootstrap.ok) throw new Error(`NSE bootstrap HTTP ${bootstrap.status}`);

    const headers = bootstrap.headers as Headers & { getSetCookie?: () => string[] };
    const cookieValues = headers.getSetCookie?.() ?? [bootstrap.headers.get("set-cookie") ?? ""];
    const cookie = cookieValues.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
    const response = await fetcher(NSE_INDICES, {
      headers: { ...NSE_HEADERS, ...(cookie ? { Cookie: cookie } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`NSE data HTTP ${response.status}`);
    const payload = await response.json() as { data?: unknown };
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    if (rows.length === 0) throw new Error("NSE returned no index rows");
    return result("nse", "ONLINE", started, "NSE index data request succeeded.", rows.length);
  } catch (error) {
    const status = error instanceof Error && /HTTP \d{3}/.test(error.message) ? "OFFLINE" : "ERROR";
    return result("nse", status, started, safeFailure(error, "NSE"));
  }
}

async function checkTradingView(fetcher: Fetcher): Promise<MarketDataHealthCheck> {
  const started = Date.now();
  try {
    const response = await fetcher(TRADINGVIEW_SCAN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://www.tradingview.com/",
      },
      body: JSON.stringify({
        symbols: { tickers: TRADINGVIEW_TICKERS },
        columns: TRADINGVIEW_COLUMNS,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`TradingView HTTP ${response.status}`);
    const quotes = normalizeTradingViewScan(await response.json());
    if (quotes.length === 0) throw new Error("TradingView returned no valid quotes");
    return result("tradingview", "ONLINE", started, "TradingView scanner returned valid quotes.", quotes.length);
  } catch (error) {
    const status = error instanceof Error && /HTTP \d{3}/.test(error.message) ? "OFFLINE" : "ERROR";
    return result("tradingview", status, started, safeFailure(error, "TradingView"));
  }
}

async function checkDhan(accountId: string | null): Promise<MarketDataHealthCheck> {
  const started = Date.now();

  try {
    const db = createServerSupabaseClient();
    if (accountId) {
      const { data: account, error: accountError } = await db
        .from("trading_accounts")
        .select("id,status,is_active")
        .eq("id", accountId)
        .maybeSingle();
      if (accountError || !account) return result("dhan", "ERROR", started, "Trading account status is unavailable.");
      if (String(account.status).toLowerCase() !== "active" || account.is_active !== true) {
        return result("dhan", "OFFLINE", started, "Trading account is inactive.");
      }
    }

    let query = db
      .from("broker_credentials")
      .select("is_active,is_connected,last_tested_at,last_test_result")
      .eq("broker_id", "dhan")
      .eq("environment", "production")
      .eq("is_active", true);
    if (accountId) query = query.eq("trading_account_id", accountId);
    query = query.limit(1);
    const { data: row, error } = await query.maybeSingle();
    if (error) return result("dhan", "ERROR", started, "Dhan credential status is unavailable.");
    if (!row) return result("dhan", "OFFLINE", started, "No active Dhan credential is configured.");
    if (row.is_active === true && row.is_connected === true) {
      return result("dhan", "ONLINE", started, "Most recent Dhan authentication test succeeded.");
    }
    const detail = row.last_tested_at
      ? "Most recent Dhan authentication test failed."
      : "Dhan has not passed an authentication test.";
    return result("dhan", row.last_tested_at ? "ERROR" : "OFFLINE", started, detail);
  } catch {
    return result("dhan", "ERROR", started, "Dhan credential status is unavailable.");
  }
}

export async function getMarketDataHealth(
  accountId: string | null,
  fetcher: Fetcher = fetch,
): Promise<{ checked_at: string; data: MarketDataHealthCheck[] }> {
  const checkedAt = new Date().toISOString();
  const apiStarted = Date.now();
  const [nse, tradingView, dhan] = await Promise.all([
    checkNse(fetcher),
    checkTradingView(fetcher),
    checkDhan(accountId),
  ]);

  return {
    checked_at: checkedAt,
    data: [
      result("terminal_api", "ONLINE", apiStarted, "Terminal OS health request completed."),
      nse,
      tradingView,
      dhan,
      {
        id: "dhan_websocket",
        status: "NOT_IMPLEMENTED",
        checked_at: new Date().toISOString(),
        response_time_ms: null,
        detail: "Terminal OS does not host a persistent Dhan WebSocket relay.",
      },
    ],
  };
}