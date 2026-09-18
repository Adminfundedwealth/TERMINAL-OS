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
  const db = createServerSupabaseClient();

  const [configResult, healthResult] = await Promise.all([
    db.from("provider_config").select("*").order("provider_name"),
    db
      .from("provider_health")
      .select("*")
      .order("checked_at", { ascending: false }),
  ]);

  const configs = (configResult.data ?? []) as ProviderConfig[];
  const healthRows = (healthResult.data ?? []) as ProviderHealth[];

  // Map latest health per provider_id
  const healthMap = new Map<string, ProviderHealth>();
  for (const h of healthRows) {
    if (!healthMap.has(h.provider_id)) {
      healthMap.set(h.provider_id, h);
    }
  }

  return configs.map((cfg) => ({
    ...cfg,
    health: healthMap.get(cfg.id) ?? null,
  }));
}

export async function getProviderHealth(): Promise<ProviderHealth[]> {
  const db = createServerSupabaseClient();
  const { data } = await db
    .from("provider_health")
    .select("*")
    .order("checked_at", { ascending: false });
  return (data ?? []) as ProviderHealth[];
}
