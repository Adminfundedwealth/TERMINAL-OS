/**
 * Server-side trading accounts service.
 *
 * Canonical table: trading_accounts
 *
 * Key field mappings vs old Terminal OS schema:
 *   owner_user_id   → trader_id        (FK → terminal_traders.id)
 *   current_balance → balance
 *   status values   → lowercase ("active", "suspended", etc.)
 *
 * Columns NOT on trading_accounts (live schema):
 *   account_type, challenge_type, equity, currency,
 *   daily_loss_limit, max_drawdown, profit_target,
 *   starting_balance, expires_at, last_activity_at
 *   → These live on challenge_accounts and risk_rules tables.
 *
 * broker_credentials_encrypted is NEVER selected or returned.
 */
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TradingAccount } from "@/types";

// Columns safe to select — explicitly excludes broker_credentials_encrypted
const SAFE_COLUMNS = [
  "id",
  "trader_id",
  "challenge_id",
  "account_code",
  "broker_provider",
  "broker_client_id",
  "balance",
  "available_margin",
  "used_margin",
  "status",
  "locked_reason",
  "locked_at",
  "unlocked_at",
  "created_at",
  "updated_at",
  "daily_profit_cap_until",
  "first_payout_approved_at",
].join(", ");

export interface AccountFilters {
  status?: string;
  trader_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export async function getAccounts(filters: AccountFilters = {}): Promise<{
  data: TradingAccount[];
  total: number;
}> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.page_size ?? 25));
  const offset = (page - 1) * pageSize;
  const sortBy = filters.sort_by ?? "created_at";
  const sortOrder = filters.sort_order ?? "desc";

  let query = db
    .from("trading_accounts")
    .select(SAFE_COLUMNS, { count: "exact" });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.trader_id) query = query.eq("trader_id", filters.trader_id);
  if (filters.search) {
    // Search by account_code or trader_id
    query = query.or(
      `account_code.ilike.%${filters.search}%,trader_id.ilike.%${filters.search}%`
    );
  }

  const { data, count, error } = await query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  return {
    data: (data ?? []) as TradingAccount[],
    total: count ?? 0,
  };
}

export async function getAccountById(id: string): Promise<TradingAccount | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("trading_accounts")
    .select(SAFE_COLUMNS)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as TradingAccount;
}

export async function getAccountSummaryStats(accountId: string) {
  const db = createServerSupabaseClient();
  const today = new Date().toISOString().split("T")[0];

  const [ordersToday, openPositions, closedPositions, latestMetrics] =
    await Promise.allSettled([
      // Trading orders placed today (uses trading_orders, NOT the payment `orders` table)
      db
        .from("trading_orders")
        .select("id", { count: "exact", head: true })
        .eq("trading_account_id", accountId)
        .gte("placed_at", `${today}T00:00:00.000Z`),

      // Currently open positions
      db
        .from("positions")
        .select("id, symbol, qty, avg_price, current_price, unrealized_pnl, side, segment")
        .eq("trading_account_id", accountId)
        .eq("is_open", true),

      // Closed positions count
      db
        .from("positions")
        .select("id", { count: "exact", head: true })
        .eq("trading_account_id", accountId)
        .eq("is_open", false),

      // Latest daily metrics row for this account
      db
        .from("account_metrics")
        .select("realized_pnl, unrealized_pnl, total_trades, winning_trades, losing_trades, daily_loss, starting_balance, ending_balance, peak_balance")
        .eq("trading_account_id", accountId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  return {
    orders_today:
      ordersToday.status === "fulfilled" ? (ordersToday.value.count ?? 0) : 0,
    open_positions:
      openPositions.status === "fulfilled"
        ? (openPositions.value.data ?? [])
        : [],
    closed_positions_count:
      closedPositions.status === "fulfilled"
        ? (closedPositions.value.count ?? 0)
        : 0,
    latest_metrics:
      latestMetrics.status === "fulfilled"
        ? latestMetrics.value.data
        : null,
  };
}
