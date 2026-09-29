import type { MarketDataProviderId } from "./types";

export type MarketDataErrorCode =
  | "MISSING_CREDENTIALS"
  | "INVALID_CREDENTIALS"
  | "INVALID_REQUEST"
  | "INVALID_INSTRUMENT"
  | "UPSTREAM_ERROR"
  | "CREDENTIAL_STORAGE_ERROR"
  | "ACCOUNT_NOT_FOUND"
  | "ACCOUNT_INACTIVE"
  | "INVALID_PROVIDER_ACCOUNT";

const PUBLIC_MESSAGES: Record<MarketDataErrorCode, string> = {
  MISSING_CREDENTIALS: "Broker credentials are not configured.",
  INVALID_CREDENTIALS: "Broker authentication failed.",
  INVALID_REQUEST: "The market-data request is invalid.",
  INVALID_INSTRUMENT: "The requested instrument is invalid or unavailable.",
  UPSTREAM_ERROR: "The broker market-data service could not complete the request.",
  CREDENTIAL_STORAGE_ERROR: "Broker credentials could not be loaded securely.",
  ACCOUNT_NOT_FOUND: "The trading account was not found or is not accessible.",
  ACCOUNT_INACTIVE: "The trading account is inactive.",
  INVALID_PROVIDER_ACCOUNT: "The provider does not match the trading account.",
};

export class MarketDataProviderError extends Error {
  constructor(
    readonly provider: MarketDataProviderId,
    readonly code: MarketDataErrorCode,
    readonly upstreamStatus?: number
  ) {
    super(PUBLIC_MESSAGES[code]);
    this.name = "MarketDataProviderError";
  }
}