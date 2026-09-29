import "server-only";
import { parseCsv } from "./csv";
import { MarketDataProviderError } from "./provider-error";
import type {
  BrokerCredentialMap,
  Fetcher,
  MarketCandle,
  MarketDataProvider,
  MarketInstrument,
  MarketQuote,
} from "./types";

const DHAN_API = "https://api.dhan.co/v2";
const DHAN_INSTRUMENT_MASTER = "https://images.dhan.co/api-data/api-scrip-master.csv";
const DHAN_SEGMENTS = new Set(["IDX_I", "NSE_EQ", "NSE_FNO", "BSE_EQ", "BSE_FNO", "MCX_COMM"]);
const INTERVALS: Record<string, string> = {
  "1m": "1", "1": "1", "5m": "5", "5": "5", "15m": "15", "15": "15",
  "25m": "25", "25": "25", "60m": "60", "60": "60", day: "day", "1d": "day",
};

function credential(credentials: BrokerCredentialMap, ...keys: string[]): string {
  for (const key of keys) {
    const value = credentials[key]?.trim();
    if (value) return value;
  }
  return "";
}

function numeric(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requireValue(value: number | null, provider: "dhan"): number {
  if (value === null) throw new MarketDataProviderError(provider, "UPSTREAM_ERROR");
  return value;
}

export class DhanMarketDataProvider implements MarketDataProvider {
  private readonly clientId: string;
  private readonly accessToken: string;
  private instrumentCache: { expiresAt: number; rows: MarketInstrument[] } | null = null;

  constructor(credentials: BrokerCredentialMap, private readonly fetcher: Fetcher = fetch) {
    this.clientId = credential(credentials, "client_id", "clientId");
    this.accessToken = credential(credentials, "access_token", "accessToken");
    if (!this.clientId || !this.accessToken) {
      throw new MarketDataProviderError("dhan", "MISSING_CREDENTIALS");
    }
  }

  async authenticate(): Promise<{ authenticated: true }> {
    const response = await this.fetcher(`${DHAN_API}/profile`, { headers: this.headers(), cache: "no-store" });
    const payload = await this.readJson(response);
    if (!payload || payload.status !== "success" || !payload.data) {
      throw new MarketDataProviderError("dhan", "INVALID_CREDENTIALS", response.status);
    }
    return { authenticated: true };
  }

  async searchInstruments(query: string): Promise<MarketInstrument[]> {
    const needle = query.trim().toUpperCase();
    if (!needle) throw new MarketDataProviderError("dhan", "INVALID_REQUEST");
    const instruments = await this.getInstrumentMaster();
    return instruments.filter((instrument) =>
      instrument.symbol.toUpperCase().includes(needle) ||
      instrument.tradingSymbol.toUpperCase().includes(needle)
    ).slice(0, 50);
  }

  async getQuote(instrument: MarketInstrument): Promise<MarketQuote> {
    this.validateInstrument(instrument);
    const response = await this.fetcher(`${DHAN_API}/marketfeed/ltp`, {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ [instrument.exchangeSegment]: [Number(instrument.providerInstrumentId)] }),
      cache: "no-store",
    });
    const payload = await this.readJson(response);
    const quote = payload.data?.[instrument.exchangeSegment]?.[instrument.providerInstrumentId];
    if (!quote) throw new MarketDataProviderError("dhan", "INVALID_INSTRUMENT", response.status);

    const ltp = requireValue(numeric(quote.last_price), "dhan");
    const ohlc = quote.ohlc ?? {};
    const previousClose = numeric(ohlc.close ?? quote.previous_close);
    const change = previousClose === null ? null : ltp - previousClose;
    return {
      provider: "dhan",
      symbol: instrument.symbol,
      tradingSymbol: instrument.tradingSymbol,
      exchange: instrument.exchange,
      ltp,
      open: numeric(ohlc.open),
      high: numeric(ohlc.high),
      low: numeric(ohlc.low),
      previousClose,
      change,
      changePercent: previousClose && change !== null ? (change / previousClose) * 100 : null,
      volume: numeric(quote.volume),
      openInterest: numeric(quote.oi),
      timestamp: String(quote.last_trade_time ?? new Date().toISOString()),
    };
  }

  async getHistoricalCandles(
    instrument: MarketInstrument,
    interval: string,
    fromDate: string,
    toDate: string
  ): Promise<MarketCandle[]> {
    this.validateInstrument(instrument);
    const dhanInterval = INTERVALS[interval.toLowerCase()];
    if (!dhanInterval || !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      throw new MarketDataProviderError("dhan", "INVALID_REQUEST");
    }
    const daily = dhanInterval === "day";
    const endpoint = daily ? "historical" : "intraday";
    const body: Record<string, string | number> = {
      securityId: instrument.providerInstrumentId,
      exchangeSegment: instrument.exchangeSegment,
      instrument: instrument.instrumentType,
      fromDate,
      toDate,
    };
    if (daily) body.expiryCode = 0;
    else body.interval = dhanInterval;

    const response = await this.fetcher(`${DHAN_API}/charts/${endpoint}`, {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await this.readJson(response);
    const data = payload.data;
    if (!data || !Array.isArray(data.timestamp)) {
      throw new MarketDataProviderError("dhan", "UPSTREAM_ERROR", response.status);
    }
    return data.timestamp.map((timestamp: unknown, index: number) => ({
      timestamp: String(timestamp),
      open: numeric(data.open?.[index]) ?? 0,
      high: numeric(data.high?.[index]) ?? 0,
      low: numeric(data.low?.[index]) ?? 0,
      close: numeric(data.close?.[index]) ?? 0,
      volume: numeric(data.volume?.[index]) ?? 0,
      ...(numeric(data.oi?.[index]) === null ? {} : { openInterest: numeric(data.oi[index])! }),
    }));
  }

  private headers(): HeadersInit {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      "access-token": this.accessToken,
      "client-id": this.clientId,
    };
  }

  private async readJson(response: Response): Promise<any> {
    if (!response.ok) {
      throw new MarketDataProviderError(
        "dhan",
        response.status === 401 || response.status === 403 ? "INVALID_CREDENTIALS" : "UPSTREAM_ERROR",
        response.status
      );
    }
    try {
      return await response.json();
    } catch {
      throw new MarketDataProviderError("dhan", "UPSTREAM_ERROR", response.status);
    }
  }

  private validateInstrument(instrument: MarketInstrument): void {
    if (
      instrument.provider !== "dhan" ||
      !/^\d+$/.test(instrument.providerInstrumentId) ||
      !DHAN_SEGMENTS.has(instrument.exchangeSegment)
    ) {
      throw new MarketDataProviderError("dhan", "INVALID_INSTRUMENT");
    }
  }

  private async getInstrumentMaster(): Promise<MarketInstrument[]> {
    if (this.instrumentCache && this.instrumentCache.expiresAt > Date.now()) {
      return this.instrumentCache.rows;
    }
    const response = await this.fetcher(DHAN_INSTRUMENT_MASTER, { headers: { Accept: "text/csv" }, cache: "no-store" });
    if (!response.ok) throw new MarketDataProviderError("dhan", "UPSTREAM_ERROR", response.status);
    const rows = parseCsv(await response.text()).map((row) => this.toInstrument(row)).filter((row): row is MarketInstrument => row !== null);
    this.instrumentCache = { rows, expiresAt: Date.now() + 60 * 60 * 1000 };
    return rows;
  }

  private toInstrument(row: Record<string, string>): MarketInstrument | null {
    const securityId = row.SEM_SMST_SECURITY_ID;
    const rawSegment = row.SEM_SEGMENT?.toUpperCase();
    const exchange = row.SEM_EXM_EXCH_ID?.toUpperCase();
    if (!securityId || !rawSegment || !exchange) return null;

    const exchangeSegment = rawSegment.includes("_")
      ? rawSegment
      : rawSegment === "I" ? "IDX_I"
        : rawSegment === "D" ? (exchange === "BSE" ? "BSE_FNO" : "NSE_FNO")
          : exchange === "BSE" ? "BSE_EQ" : exchange === "MCX" ? "MCX_COMM" : "NSE_EQ";
    if (!DHAN_SEGMENTS.has(exchangeSegment)) return null;

    const tradingSymbol = row.SEM_TRADING_SYMBOL || row.SEM_CUSTOM_SYMBOL || row.SEM_INSTRUMENT_NAME || "";
    if (!tradingSymbol) return null;
    return {
      provider: "dhan",
      providerInstrumentId: securityId,
      symbol: row.SEM_INSTRUMENT_NAME || tradingSymbol,
      tradingSymbol,
      exchange,
      exchangeSegment,
      instrumentType: row.SEM_EXM_INSTRUMENT_TYPE || (exchangeSegment === "IDX_I" ? "INDEX" : "EQUITY"),
      lotSize: numeric(row.SEM_LOT_UNITS) ?? undefined,
      tickSize: numeric(row.SEM_TICK_SIZE) ?? undefined,
      expiryDate: row.SEM_EXPIRY_DATE || undefined,
      strikePrice: numeric(row.SEM_STRIKE_PRICE) ?? undefined,
      optionType: row.SEM_OPTION_TYPE || undefined,
    };
  }
}