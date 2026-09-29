import "server-only";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler-client";
import { MarketDataProviderError } from "@/server/brokers/provider-error";
import type { MarketDataProviderId } from "@/server/brokers/types";

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