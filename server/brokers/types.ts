export type MarketDataProviderId = "dhan" | "kite";

export interface MarketInstrument {
  provider: MarketDataProviderId;
  providerInstrumentId: string;
  symbol: string;
  tradingSymbol: string;
  exchange: string;
  exchangeSegment: string;
  instrumentType: string;
  lotSize?: number;
  tickSize?: number;
  expiryDate?: string;
  strikePrice?: number;
  optionType?: string;
}

export interface MarketQuote {
  provider: MarketDataProviderId;
  symbol: string;
  tradingSymbol: string;
  exchange: string;
  ltp: number;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  openInterest: number | null;
  timestamp: string;
}

export interface MarketCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest?: number;
}

export interface MarketDataProvider {
  authenticate(): Promise<{ authenticated: true }>;
  searchInstruments(query: string): Promise<MarketInstrument[]>;
  getQuote(instrument: MarketInstrument): Promise<MarketQuote>;
  getHistoricalCandles(
    instrument: MarketInstrument,
    interval: string,
    fromDate: string,
    toDate: string
  ): Promise<MarketCandle[]>;
}

export type BrokerCredentialMap = Readonly<Record<string, string>>;
export type Fetcher = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;