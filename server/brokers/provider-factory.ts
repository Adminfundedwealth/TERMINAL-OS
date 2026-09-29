import "server-only";
import { getMarketDataCredentials } from "@/server/services/broker-credentials";
import { DhanMarketDataProvider } from "./dhan";
import { KiteMarketDataProvider } from "./kite";
import type { MarketDataProvider, MarketDataProviderId } from "./types";

export async function createStoredMarketDataProvider(
  tradingAccountId: string,
  provider: MarketDataProviderId,
  environment: "production" | "paper" | "sandbox" = "production"
): Promise<MarketDataProvider> {
  const credentials = await getMarketDataCredentials(tradingAccountId, provider, environment);
  return provider === "dhan"
    ? new DhanMarketDataProvider(credentials)
    : new KiteMarketDataProvider(credentials);
}