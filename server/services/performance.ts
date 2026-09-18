import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DailyPerformance } from "@/types";

export interface PerformanceFilters {
  trading_account_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export async function getDailyPerformance(
  filters: PerformanceFilters = {}
): Promise<{ data: DailyPerformance[]; total: number }> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 31);
  const offset = (page - 1) * pageSize;

  let query = db.from("daily_performance").select("*", { count: "exact" });

  if (filters.trading_account_id)
    query = query.eq("trading_account_id", filters.trading_account_id);
  if (filters.date_from) query = query.gte("date", filters.date_from);
  if (filters.date_to) query = query.lte("date", filters.date_to);

  const { data, count, error } = await query
    .order("date", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as DailyPerformance[], total: count ?? 0 };
}

export async function getPerformanceSummary(accountId: string) {
  const db = createServerSupabaseClient();
  const { data } = await db
    .from("daily_performance")
    .select("*")
    .eq("trading_account_id", accountId)
    .order("date", { ascending: false })
    .limit(365);

  const rows = (data ?? []) as DailyPerformance[];

  const totalPnl = rows.reduce((s, r) => s + r.daily_pnl, 0);
  const tradingDays = rows.length;
  const winDays = rows.filter((r) => r.daily_pnl > 0).length;
  const lossDays = rows.filter((r) => r.daily_pnl < 0).length;
  const totalTrades = rows.reduce((s, r) => s + r.total_trades, 0);
  const winningTrades = rows.reduce((s, r) => s + r.winning_trades, 0);
  const losingTrades = rows.reduce((s, r) => s + r.losing_trades, 0);
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const dailyPnl = rows.find((r) => r.date === today)?.daily_pnl ?? null;
  const weeklyPnl = rows
    .filter((r) => r.date >= weekAgo)
    .reduce((s, r) => s + r.daily_pnl, 0);
  const monthlyPnl = rows
    .filter((r) => r.date >= monthAgo)
    .reduce((s, r) => s + r.daily_pnl, 0);

  return {
    total_pnl: totalPnl,
    daily_pnl: dailyPnl,
    weekly_pnl: weeklyPnl,
    monthly_pnl: monthlyPnl,
    trading_days: tradingDays,
    win_days: winDays,
    loss_days: lossDays,
    total_trades: totalTrades,
    winning_trades: winningTrades,
    losing_trades: losingTrades,
    win_rate: winRate,
    rows,
  };
}
