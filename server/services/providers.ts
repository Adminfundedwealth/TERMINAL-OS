/**
 * Provider service — reads provider config and health from Terminal Supabase #2.
 * CRITICAL: Never returns API secrets, access tokens, or private keys.
 * Only operational status information is returned.
 */
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProviderConfig, ProviderHealth } from "@/types";

export async function getProvidersWithHealth(): Promise<
  (ProviderConfig & { health: ProviderHealth | null })[]
> {
  return [];
}

export async function getProviderHealth(): Promise<ProviderHealth[]> {
  return [];
}
