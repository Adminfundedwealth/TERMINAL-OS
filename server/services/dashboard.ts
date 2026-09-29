import { createCanonicalAdminClient } from "@/lib/supabase/canonical-admin";
import type { DashboardSummary } from "@/types";

const EMPTY_SUMMARY: DashboardSummary = {
  total_accounts: 0,
  active_accounts: 0,
  orders_today: 0,
  executions_today: 0,
  open_positions: 0,
  total_exposure: 0,
  risk_events_today: 0,
  system_health: {
    database: "UNKNOWN",
    market_data: "UNKNOWN",
    websocket: "UNKNOWN",
    order_service: "UNKNOWN",
    risk_service: "UNKNOWN",
  },
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const db = createCanonicalAdminClient();
    const today = new Date().toISOString().split("T")[0];

    const [
      accountsResult,
      activeAccountsResult,
      ordersTodayResult,
      executionsTodayResult,
      openPositionsResult,
      exposureResult,
      riskEventsTodayResult,
      dbHealthResult,
    ] = await Promise.allSettled([
      db.from("trading_accounts").select("id", { count: "exact", head: true }),
      // Live DB status is lowercase "active"
      db.from("trading_accounts").select("id", { count: "exact", head: true }).eq("status", "active"),
      db.from("orders").select("id", { count: "exact", head: true }).gte("submitted_at", `${today}T00:00:00.000Z`),
      db.from("executions").select("id", { count: "exact", head: true }).gte("executed_at", `${today}T00:00:00.000Z`),
      db.from("positions").select("id", { count: "exact", head: true }).eq("position_status", "open"),
      // Exposure = sum(qty * avg_price) for open positions
      db.from("positions").select("quantity, average_price").eq("position_status", "open"),
      db.from("risk_events").select("id", { count: "exact", head: true }).gte("occurred_at", `${today}T00:00:00.000Z`),
      // DB health probe — use a table that always exists
      db.from("trading_accounts").select("id", { count: "exact", head: true }),
    ]);

    function extractCount(result: PromiseSettledResult<{ count?: number | null }>): number {
      if (result.status === "fulfilled" && result.value?.count != null) {
        return result.value.count;
      }
      return 0;
    }

    let totalExposure = 0;
    if (exposureResult.status === "fulfilled" && exposureResult.value?.data) {
      const posRows = exposureResult.value.data as Array<{ quantity: number; average_price: number }>;
      totalExposure = posRows.reduce((sum, pos) => sum + pos.quantity * (pos.average_price ?? 0), 0);
    }

    const dbHealthy = dbHealthResult.status === "fulfilled" && !dbHealthResult.value?.error;

    return {
      total_accounts: extractCount(accountsResult as PromiseSettledResult<{ count?: number | null }>),
      active_accounts: extractCount(activeAccountsResult as PromiseSettledResult<{ count?: number | null }>),
      orders_today: extractCount(ordersTodayResult as PromiseSettledResult<{ count?: number | null }>),
      executions_today: extractCount(executionsTodayResult as PromiseSettledResult<{ count?: number | null }>),
      open_positions: extractCount(openPositionsResult as PromiseSettledResult<{ count?: number | null }>),
      total_exposure: totalExposure,
      risk_events_today: extractCount(riskEventsTodayResult as PromiseSettledResult<{ count?: number | null }>),
      system_health: {
        database: dbHealthy ? "HEALTHY" : "UNKNOWN",
        market_data: "UNKNOWN",
        websocket: "UNKNOWN",
        order_service: "UNKNOWN",
        risk_service: "UNKNOWN",
      },
    };
  } catch {
    return EMPTY_SUMMARY;
  }
}

export async function getRecentAccounts(limit = 5) {
  try {
    const db = createCanonicalAdminClient();
    const { data } = await db
      .from("trading_accounts")
      // Safe columns — broker_credentials_encrypted excluded
      .select("id, account_code, owner_user_id, status, broker_provider, account_type, currency, current_balance, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((row) => ({ ...row, trader_id: row.owner_user_id, balance: row.current_balance }));
  } catch {
    return [];
  }
}

export async function getRecentOrders(limit = 10) {
  try {
    const db = createCanonicalAdminClient();
    const { data } = await db
      .from("orders")
      .select("id, account_id, symbol, segment, exchange, side, order_type, quantity, status, submitted_at")
      .order("submitted_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((row) => ({ ...row, trading_account_id: row.account_id, qty: row.quantity, placed_at: row.submitted_at }));
  } catch {
    return [];
  }
}

export async function getRecentRiskEvents(limit = 5) {
  try {
    const db = createCanonicalAdminClient();
    const { data } = await db
      .from("risk_events")
      .select("id, account_id, event_type, severity, metric_name, metric_value, limit_value, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((row) => ({ ...row, trading_account_id: row.account_id, metric: row.metric_name ?? "", actual_value: row.metric_value, threshold: row.limit_value, created_at: row.occurred_at }));
  } catch {
    return [];
  }
}
