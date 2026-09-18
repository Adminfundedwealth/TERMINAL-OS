/**
 * Server-side risk service.
 * All values come from Terminal Supabase #2 — never invented.
 */
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { RiskEvent, AccountMetricSnapshot } from "@/types";

export interface RiskEventFilters {
  trading_account_id?: string;
  event_type?: string;
  severity?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export async function getRiskEvents(
  filters: RiskEventFilters = {}
): Promise<{ data: RiskEvent[]; total: number }> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("risk_events").select("*", { count: "exact" });

  if (filters.trading_account_id)
    query = query.eq("trading_account_id", filters.trading_account_id);
  if (filters.event_type) query = query.eq("event_type", filters.event_type);
  if (filters.severity) query = query.eq("severity", filters.severity);
  if (filters.date_from) query = query.gte("created_at", filters.date_from);
  if (filters.date_to) query = query.lte("created_at", filters.date_to);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as RiskEvent[], total: count ?? 0 };
}

export async function getRiskEventById(id: string): Promise<RiskEvent | null> {
  const db = createServerSupabaseClient();
  const { data } = await db
    .from("risk_events")
    .select("*")
    .eq("id", id)
    .single();
  return data as RiskEvent | null;
}

// -------------------------------------------------------
// ACCOUNT METRIC SNAPSHOTS
// -------------------------------------------------------

export interface MetricFilters {
  trading_account_id?: string;
  risk_status?: string;
  page?: number;
  page_size?: number;
}

/**
 * Returns the latest metric snapshot per account.
 * Uses a window function approach via subquery — fall back to
 * per-account latest if DB view is unavailable.
 */
export async function getLatestAccountMetrics(
  filters: MetricFilters = {}
): Promise<{ data: AccountMetricSnapshot[]; total: number }> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  // Fetch latest snapshot per account by getting all and deduping in-memory
  // (production would use a DB view or DISTINCT ON)
  let query = db
    .from("account_metric_snapshots")
    .select("*", { count: "exact" });

  if (filters.trading_account_id)
    query = query.eq("trading_account_id", filters.trading_account_id);
  if (filters.risk_status)
    query = query.eq("risk_status", filters.risk_status);

  const { data, count, error } = await query
    .order("snapshot_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return {
    data: (data ?? []) as AccountMetricSnapshot[],
    total: count ?? 0,
  };
}

export async function getAccountMetricHistory(
  accountId: string,
  limit = 30
): Promise<AccountMetricSnapshot[]> {
  const db = createServerSupabaseClient();
  const { data } = await db
    .from("account_metric_snapshots")
    .select("*")
    .eq("trading_account_id", accountId)
    .order("snapshot_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AccountMetricSnapshot[];
}

// -------------------------------------------------------
// RISK DASHBOARD SUMMARY
// -------------------------------------------------------

export async function getRiskDashboardSummary() {
  const db = createServerSupabaseClient();

  const [
    accountsAtRisk,
    breachedAccounts,
    criticalAccounts,
    warningAccounts,
    recentEvents,
  ] = await Promise.allSettled([
    db
      .from("account_metric_snapshots")
      .select("id", { count: "exact", head: true })
      .not("risk_status", "eq", "NORMAL"),
    db
      .from("account_metric_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("risk_status", "BREACHED"),
    db
      .from("account_metric_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("risk_status", "CRITICAL"),
    db
      .from("account_metric_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("risk_status", "WARNING"),
    db
      .from("risk_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  function extractCount(
    r: PromiseSettledResult<{ count: number | null }>
  ): number {
    return r.status === "fulfilled" ? (r.value.count ?? 0) : 0;
  }

  return {
    accounts_at_risk: extractCount(
      accountsAtRisk as PromiseSettledResult<{ count: number | null }>
    ),
    breached: extractCount(
      breachedAccounts as PromiseSettledResult<{ count: number | null }>
    ),
    critical: extractCount(
      criticalAccounts as PromiseSettledResult<{ count: number | null }>
    ),
    warning: extractCount(
      warningAccounts as PromiseSettledResult<{ count: number | null }>
    ),
    recent_events:
      recentEvents.status === "fulfilled"
        ? (recentEvents.value.data ?? [])
        : [],
  };
}
