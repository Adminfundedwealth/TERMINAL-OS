import "server-only";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler-client";
import { MarketDataProviderError } from "@/server/brokers/provider-error";
import type { MarketDataProviderId } from "@/server/brokers/types";
import { getMarketDataCredentials } from "@/server/services/broker-credentials";

export interface AuthorizedMarketDataAccount {
  id: string;
  owner_user_id: string;
  status: string;
  is_active: boolean;
}

export async function authorizeMarketDataAccount(
  accessToken: string,
  userId: string,
  accountId: string,
  provider: MarketDataProviderId
): Promise<AuthorizedMarketDataAccount> {
  if (!accountId) throw new MarketDataProviderError(provider, "INVALID_REQUEST");

  const client = await createRouteHandlerSupabaseClient(accessToken);
  const { data, error } = await client.rpc("get_active_account_context", {
    requested_account_id: accountId,
  });
  const account = (data as { account?: AuthorizedMarketDataAccount } | null)?.account;
  if (error || !account || account.id !== accountId || account.owner_user_id !== userId) {
    throw new MarketDataProviderError(provider, "ACCOUNT_NOT_FOUND");
  }
  if (account.status?.toLowerCase() !== "active" || account.is_active !== true) {
    throw new MarketDataProviderError(provider, "ACCOUNT_INACTIVE");
  }

  return account;
}

export interface RealtimeMarketDataSubscription {
  account_id: string;
  provider: MarketDataProviderId;
  environment: "production" | "paper" | "sandbox";
}

export interface AuthorizedRealtimeMarketDataSubscription {
  account: AuthorizedMarketDataAccount;
  provider: MarketDataProviderId;
  environment: RealtimeMarketDataSubscription["environment"];
  credentials: Record<string, string>;
}

/** Server-side only: returns credentials to a trusted persistent-service caller after authorization. */
export async function authorizeRealtimeMarketDataSubscription(
  accessToken: string,
  userId: string,
  subscription: RealtimeMarketDataSubscription
): Promise<AuthorizedRealtimeMarketDataSubscription> {
  const account = await authorizeMarketDataAccount(
    accessToken,
    userId,
    subscription.account_id,
    subscription.provider
  );
  const credentials = await getMarketDataCredentials(
    account.id,
    subscription.provider,
    subscription.environment
  );
  return {
    account,
    provider: subscription.provider,
    environment: subscription.environment,
    credentials,
  };
}