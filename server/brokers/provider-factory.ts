import "server-only";
import { getActiveCentralMarketDataCredentials } from "@/server/services/broker-connections";
import { getMarketDataCredentials } from "@/server/services/broker-credentials";
import { MarketDataProviderError } from "@/server/brokers/provider-error";
import { DhanMarketDataProvider } from "./dhan";
import { KiteMarketDataProvider } from "./kite";
import type { MarketDataProvider, MarketDataProviderId } from "./types";

export async function createStoredMarketDataProvider(
  tradingAccountId: string | null | undefined,
  provider: MarketDataProviderId,
  environment: "production" | "paper" | "sandbox" = "production"
): Promise<MarketDataProvider> {
  let credentials: Record<string, string>;
  if (provider === "dhan") {
    credentials = await getActiveCentralMarketDataCredentials({ broker_id: "dhan", environment });
  } else {
    if (!tradingAccountId) throw new MarketDataProviderError("kite", "INVALID_REQUEST");
    credentials = await getMarketDataCredentials(tradingAccountId, provider, environment);
  }
  return provider === "dhan"
    ? new DhanMarketDataProvider(credentials)
    : new KiteMarketDataProvider(credentials);
}