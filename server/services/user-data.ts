import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Watchlist, Alert, JournalEntry } from "@/types";

// -------------------------------------------------------
// WATCHLISTS
// -------------------------------------------------------

export async function getWatchlists(
  filters: { trader_id?: string; page?: number; page_size?: number } = {}
): Promise<{ data: Watchlist[]; total: number }> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("watchlists").select("*", { count: "exact" });
  if (filters.trader_id) query = query.eq("trader_id", filters.trader_id);

  const { data, count, error } = await query
    .order("updated_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as Watchlist[], total: count ?? 0 };
}

// -------------------------------------------------------
// ALERTS
// -------------------------------------------------------

export async function getAlerts(
  filters: {
    trading_account_id?: string;
    owner_user_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  } = {}
): Promise<{ data: Alert[]; total: number }> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("alerts").select("*", { count: "exact" });
  if (filters.trading_account_id) query = query.eq("trading_account_id", filters.trading_account_id);
  if (filters.owner_user_id) query = query.eq("owner_user_id", filters.owner_user_id);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as Alert[], total: count ?? 0 };
}

// -------------------------------------------------------
// JOURNAL
// -------------------------------------------------------

export async function getJournalEntries(
  filters: {
    trading_account_id?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  } = {}
): Promise<{ data: JournalEntry[]; total: number }> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("journal_entries").select("*", { count: "exact" });
  if (filters.trading_account_id) query = query.eq("trading_account_id", filters.trading_account_id);
  if (filters.date_from) query = query.gte("date", filters.date_from);
  if (filters.date_to) query = query.lte("date", filters.date_to);

  const { data, count, error } = await query
    .order("date", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as JournalEntry[], total: count ?? 0 };
}
