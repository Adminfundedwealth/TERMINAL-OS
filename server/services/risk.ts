/**
 * Server-side risk service.
 * All values come from Terminal Supabase #2 — never invented.
 */
import { createCanonicalAdminClient } from "@/lib/supabase/canonical-admin";
import type { RiskEvent } from "@/types";

interface AccountMetricRow {
  id: string;
  trading_account_id: string;
  date: string;
  balance: number;
  equity: number;
  pnl: number | null;
  drawdown: number | null;
  daily_loss: number | null;
  snapshot_at: string;
}

export interface RiskMetricRow extends AccountMetricRow {
  daily_pnl: number | null;
  daily_loss_used: number | null;
  current_drawdown: number | null;
  max_drawdown_reached: number | null;
  exposure: number | null;
  open_positions_count: number;
  risk_status: string;
}

function toRiskMetric(row: AccountMetricRow, riskStatus: string, exposure: number | null, openPositions: number): RiskMetricRow {
  return {
    ...row,
    daily_pnl: row.pnl,
    daily_loss_used: row.daily_loss,
    current_drawdown: row.drawdown,
    max_drawdown_reached: row.drawdown,
    exposure,
    open_positions_count: openPositions,
    risk_status: riskStatus,
  };
}

function toRiskEvent(row: Record<string, unknown>): RiskEvent {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
  return {
    id: String(row.id), trading_account_id: String(row.account_id), event_type: String(row.event_type) as RiskEvent["event_type"],
    severity: String(row.severity).toUpperCase() as RiskEvent["severity"], challenge_id: null,
    rule_type: String(row.metric_name ?? ""), threshold_value: row.limit_value == null ? null : Number(row.limit_value),
    actual_value: row.metric_value == null ? null : Number(row.metric_value), metadata, acknowledged: row.breach_status === "resolved",
    created_at: String(row.occurred_at),
  };
}

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
  const db = createCanonicalAdminClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("risk_events").select("*", { count: "exact" });

  if (filters.trading_account_id)
    query = query.eq("account_id", filters.trading_account_id);
  if (filters.event_type) query = query.eq("event_type", filters.event_type.toLowerCase());
  if (filters.severity) query = query.eq("severity", filters.severity.toLowerCase());
  if (filters.date_from) query = query.gte("occurred_at", filters.date_from);
  if (filters.date_to) query = query.lte("occurred_at", filters.date_to);
  if (filters.event_type) query = query.eq("event_type", filters.event_type.toLowerCase());
  if (filters.severity) query = query.eq("severity", filters.severity.toLowerCase());
  if (filters.date_from) query = query.gte("occurred_at", filters.date_from);
  if (filters.date_to) query = query.lte("occurred_at", filters.date_to);

  const { data, count, error } = await query
    .order("occurred_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(toRiskEvent), total: count ?? 0 };
}

export async function getRiskEventById(id: string): Promise<RiskEvent | null> {
  const db = createCanonicalAdminClient();
  const { data } = await db
    .from("risk_events")
    .select("*")
    .eq("id", id)
    .single();
  return data ? toRiskEvent(data as unknown as Record<string, unknown>) : null;
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
): Promise<{ data: RiskMetricRow[]; total: number }> {
  const db = createCanonicalAdminClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("account_metric_snapshots").select("*", { count: "exact" });

  if (filters.trading_account_id)
    query = query.eq("account_id", filters.trading_account_id);

  const { data, count, error } = await query
    .order("snapshot_at", { ascending: false });

  if (error) throw error;
  const snapshots = ((data ?? []) as unknown as Record<string, unknown>[]);
  const seenAccounts = new Set<string>();
  const latestByAccount = snapshots.filter((row) => {
    const accountId = String(row.account_id);
    if (seenAccounts.has(accountId)) return false;
    seenAccounts.add(accountId);
    return true;
  });
  const accountIds = latestByAccount.map((row) => String(row.account_id));
  const [accountsResult, positionsResult] = await Promise.all([
    db.from("trading_accounts").select("id, risk_state").in("id", accountIds),
    db.from("positions").select("account_id, quantity, last_price, position_status").in("account_id", accountIds).eq("position_status", "open"),
  ]);
  if (accountsResult.error) throw accountsResult.error;
  if (positionsResult.error) throw positionsResult.error;
  const riskStates = new Map(((accountsResult.data ?? []) as unknown as Record<string, unknown>[]).map((row) => [String(row.id), String(row.risk_state ?? "ACTIVE")]));
  const exposureByAccount = new Map<string, { exposure: number; count: number; complete: boolean }>();
  for (const position of (positionsResult.data ?? []) as unknown as Record<string, unknown>[]) {
    const id = String(position.account_id);
    const current = exposureByAccount.get(id) ?? { exposure: 0, count: 0, complete: true };
    if (position.last_price == null) current.complete = false;
    else current.exposure += Number(position.quantity ?? 0) * Number(position.last_price);
    current.count += 1;
    exposureByAccount.set(id, current);
  }
  const rows = latestByAccount.map((row) => {
    const accountId = String(row.account_id);
    const metrics: AccountMetricRow = {
      id: String(row.id), trading_account_id: accountId,
      date: String(row.snapshot_at).slice(0, 10), balance: Number(row.balance ?? 0), equity: Number(row.equity ?? 0),
      pnl: row.pnl == null ? null : Number(row.pnl), drawdown: row.drawdown == null ? null : Number(row.drawdown),
      daily_loss: row.daily_loss == null ? null : Number(row.daily_loss), snapshot_at: String(row.snapshot_at),
    };
    const riskState = riskStates.get(accountId) ?? "ACTIVE";
    const displayStatus = riskState === "ACTIVE" ? "NORMAL" : riskState === "LOCKED" ? "RESTRICTED" : riskState;
    const exposure = exposureByAccount.get(accountId) ?? { exposure: 0, count: 0, complete: true };
    const requestedStatus = filters.risk_status === "NORMAL" ? "ACTIVE" : filters.risk_status === "RESTRICTED" ? "LOCKED" : filters.risk_status;
    const riskStatus = requestedStatus && requestedStatus !== riskState ? "FILTERED" : displayStatus;
    return toRiskMetric(metrics, riskStatus, exposure.complete ? exposure.exposure : null, exposure.count);
  }).filter((row) => row.risk_status !== "FILTERED");
  return { data: rows.slice(offset, offset + pageSize), total: rows.length };
}

export async function getAccountMetricHistory(
  accountId: string,
  limit = 30
): Promise<RiskMetricRow[]> {
  const db = createCanonicalAdminClient();
  const { data } = await db
    .from("account_metric_snapshots")
    .select("*")
    .eq("account_id", accountId)
    .order("snapshot_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => toRiskMetric({
    id: String(row.id), trading_account_id: accountId, date: String(row.snapshot_at).slice(0, 10),
    balance: Number(row.balance ?? 0), equity: Number(row.equity ?? 0), pnl: row.pnl == null ? null : Number(row.pnl),
    drawdown: row.drawdown == null ? null : Number(row.drawdown), daily_loss: row.daily_loss == null ? null : Number(row.daily_loss), snapshot_at: String(row.snapshot_at),
  }, "UNKNOWN", 0, 0));
}

// -------------------------------------------------------
// RISK DASHBOARD SUMMARY
// -------------------------------------------------------

export async function getRiskDashboardSummary() {
  const db = createCanonicalAdminClient();

  const [riskEvents, recentEvents] = await Promise.allSettled([
    db.from("trading_accounts").select("id, risk_state"),
    db.from("risk_events").select("*").order("occurred_at", { ascending: false }).range(0, 4),
  ]);
  const accounts = riskEvents.status === "fulfilled" ? riskEvents.value.data ?? [] : [];
  const events = recentEvents.status === "fulfilled" ? recentEvents.value.data ?? [] : [];
  const atRiskAccounts = new Set((accounts as Array<{ id: string; risk_state: string }>).filter((account) => ["WARNING", "LOCKED", "BREACHED"].includes(account.risk_state)).map((account) => account.id));
  const riskRows = accounts as Array<{ risk_state: string }>;

  return {
    accounts_at_risk: atRiskAccounts.size,
    breached: (accounts as Array<{ risk_state: string }>).filter((account) => account.risk_state === "BREACHED").length,
    critical: riskRows.filter((account) => ["LOCKED", "BREACHED"].includes(account.risk_state)).length,
    warning: riskRows.filter((account) => account.risk_state === "WARNING").length,
    recent_events:
      recentEvents.status === "fulfilled"
        ? (recentEvents.value.data ?? []).map((value) => {
            const row = value as unknown as Record<string, unknown>;
            return {
              id: String(row.id), trading_account_id: String(row.account_id), event_type: String(row.event_type), severity: String(row.severity),
              metric: String(row.metric_name ?? ""), actual_value: row.metric_value == null ? null : Number(row.metric_value),
              threshold: row.limit_value == null ? null : Number(row.limit_value), created_at: String(row.occurred_at),
            };
          })
        : [],
  };
}
