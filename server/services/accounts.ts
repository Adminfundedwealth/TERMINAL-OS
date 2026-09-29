/**
 * Server-side trading accounts service.
 *
 * Canonical table: trading_accounts
 *
 * broker_credentials_encrypted is NEVER selected or returned.
 */
import { createCanonicalAdminClient } from "@/lib/supabase/canonical-admin";
import type { TradingAccount } from "@/types";

// Columns safe to select — explicitly excludes broker_credentials_encrypted
const SAFE_COLUMNS = [
  "id",
  "owner_user_id",
  "account_code",
  "broker_provider",
  "starting_balance",
  "current_balance",
  "equity",
  "available_margin",
  "used_margin",
  "risk_state",
  "product_id",
  "phase_id",
  "rule_version_id",
  "status",
  "is_active",
  "expires_at",
  "created_at",
  "updated_at",
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

function mapAccount(row: Record<string, unknown>): TradingAccount {
  return {
    id: String(row.id),
    trader_id: String(row.owner_user_id),
    challenge_id: typeof row.phase_id === "string" ? row.phase_id : null,
    account_code: String(row.account_code ?? ""),
    broker_provider: String(row.broker_provider ?? ""),
    broker_client_id: "",
    broker_credentials_encrypted: null,
    balance: Number(row.current_balance ?? 0),
    available_margin: Number(row.available_margin ?? 0),
    used_margin: Number(row.used_margin ?? 0),
    status: String(row.status) as TradingAccount["status"],
    locked_reason: null,
    locked_at: null,
    unlocked_at: null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    daily_profit_cap_until: null,
    first_payout_approved_at: null,
  };
}

export async function getAccounts(filters: AccountFilters = {}): Promise<{
  data: TradingAccount[];
  total: number;
}> {
  const db = createCanonicalAdminClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.page_size ?? 25));
  const offset = (page - 1) * pageSize;
  const sortBy = filters.sort_by ?? "created_at";
  const sortOrder = filters.sort_order ?? "desc";

  let query = db
    .from("trading_accounts")
    .select(SAFE_COLUMNS, { count: "exact" });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.trader_id) query = query.eq("owner_user_id", filters.trader_id);
  if (filters.search) {
    // Search by account_code or trader_id
    query = query.or(
      `account_code.ilike.%${filters.search}%,owner_user_id.ilike.%${filters.search}%`
    );
  }

  const { data, count, error } = await query
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  return {
    data: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapAccount),
    total: count ?? 0,
  };
}

export async function getAccountById(id: string): Promise<TradingAccount | null> {
  const db = createCanonicalAdminClient();
  const { data, error } = await db
    .from("trading_accounts")
    .select(SAFE_COLUMNS)
    .eq("id", id)
    .single();

  if (error) return null;
  return data ? mapAccount(data as unknown as Record<string, unknown>) : null;
}

export async function getAccountSummaryStats(accountId: string) {
  const db = createCanonicalAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [ordersToday, openPositions, closedPositions, latestMetrics, latestSnapshot, accountData] =
    await Promise.allSettled([
      // Trading orders placed today in the canonical orders table.
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .gte("submitted_at", `${today}T00:00:00.000Z`),

      // Currently open positions
      db
        .from("positions")
        .select("id, symbol, quantity, average_price, last_price, unrealized_pnl, side, exchange")
        .eq("account_id", accountId)
        .eq("position_status", "open"),

      // Closed positions count
      db
        .from("positions")
        .select("id", { count: "exact", head: true })
        .eq("account_id", accountId)
        .eq("position_status", "closed"),

      // Latest daily metrics row for this account
      db
        .from("daily_performance")
        .select("realized_pnl, trade_count, winning_trades, losing_trades, fees, opening_balance, closing_balance")
        .eq("account_id", accountId)
        .order("trading_date", { ascending: false })
        .limit(1)
        .maybeSingle(),

      db.from("account_metric_snapshots").select("daily_loss").eq("account_id", accountId).order("snapshot_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("trading_accounts").select("starting_balance, current_balance, equity, peak_equity").eq("id", accountId).maybeSingle(),
    ]);

  const daily = latestMetrics.status === "fulfilled" ? latestMetrics.value.data as Record<string, unknown> | null : null;
  const positions = openPositions.status === "fulfilled" ? openPositions.value.data as Array<{ unrealized_pnl: number | null }> : [];
  const unrealizedPnl = positions.reduce((sum, position) => sum + Number(position.unrealized_pnl ?? 0), 0);
  const snapshot = latestSnapshot.status === "fulfilled" ? latestSnapshot.value.data as { daily_loss: number | null } | null : null;
  const account = accountData.status === "fulfilled" ? accountData.value.data as { starting_balance: number | null; current_balance: number | null; equity: number | null; peak_equity: number | null } | null : null;

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
    latest_metrics: daily && account ? {
      realized_pnl: daily.realized_pnl,
      unrealized_pnl: unrealizedPnl,
      total_trades: daily.trade_count,
      winning_trades: daily.winning_trades,
      losing_trades: daily.losing_trades,
      daily_loss: snapshot?.daily_loss ?? null,
      starting_balance: account.starting_balance,
      ending_balance: account.current_balance,
      peak_balance: account.peak_equity,
    } : null,
  };
}
