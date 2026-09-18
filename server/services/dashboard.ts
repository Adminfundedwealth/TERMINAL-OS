import { createServerSupabaseClient } from "@/lib/supabase/server";
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
    const db = createServerSupabaseClient();
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
      // trading_orders — NOT the payment `orders` table
      db.from("trading_orders").select("id", { count: "exact", head: true }).gte("placed_at", `${today}T00:00:00.000Z`),
      db.from("executions").select("id", { count: "exact", head: true }).gte("executed_at", `${today}T00:00:00.000Z`),
      // Live DB uses boolean is_open, not status string
      db.from("positions").select("id", { count: "exact", head: true }).eq("is_open", true),
      // Exposure = sum(qty * avg_price) for open positions
      db.from("positions").select("qty, avg_price").eq("is_open", true),
      db.from("risk_events").select("id", { count: "exact", head: true }).gte("created_at", `${today}T00:00:00.000Z`),
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
      const posRows = exposureResult.value.data as Array<{ qty: number; avg_price: number }>;
      totalExposure = posRows.reduce((sum, pos) => sum + pos.qty * (pos.avg_price ?? 0), 0);
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
    const db = createServerSupabaseClient();
    const { data } = await db
      .from("trading_accounts")
      // Safe columns — broker_credentials_encrypted excluded
      .select("id, account_code, trader_id, status, broker_provider, balance, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getRecentOrders(limit = 10) {
  try {
    const db = createServerSupabaseClient();
    // trading_orders — NOT the payment `orders` table
    const { data } = await db
      .from("trading_orders")
      .select("id, trading_account_id, symbol, segment, side, order_type, qty, status, placed_at")
      .order("placed_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getRecentRiskEvents(limit = 5) {
  try {
    const db = createServerSupabaseClient();
    const { data } = await db
      .from("risk_events")
      // Live DB: rule_type (not metric), threshold_value (not threshold), actual_value
      .select("id, trading_account_id, event_type, severity, rule_type, actual_value, threshold_value, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data ?? [];
  } catch {
    return [];
  }
}
