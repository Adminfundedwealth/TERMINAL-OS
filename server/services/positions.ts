/**
 * Server-side positions service.
 *
 * Canonical table: positions
 *
 * Key field mappings vs old Terminal OS schema:
 *   quantity      → qty
 *   average_price → avg_price
 *   ltp           → current_price
 *   status="OPEN" → is_open=true   (live DB uses boolean, not a status string)
 *   status="CLOSED"→ is_open=false
 *
 * Columns removed (do not exist in live DB):
 *   exchange, stop_loss, take_profit, status (string)
 *
 * Live DB extra columns (preserved in response):
 *   token, segment, instrument_type, product_type,
 *   buy_qty, sell_qty, buy_avg, sell_avg, margin_used
 */
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Position } from "@/types";

export interface PositionFilters {
  trading_account_id?: string;
  symbol?: string;
  segment?: string;
  side?: string;
  /** "open" | "closed" — maps to is_open boolean */
  status?: "open" | "closed";
  page?: number;
  page_size?: number;
}

export async function getPositions(
  filters: PositionFilters = {}
): Promise<{ data: Position[]; total: number }> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("positions").select("*", { count: "exact" });

  if (filters.trading_account_id)
    query = query.eq("trading_account_id", filters.trading_account_id);
  if (filters.symbol)
    query = query.ilike("symbol", `%${filters.symbol}%`);
  if (filters.segment)
    query = query.eq("segment", filters.segment);
  if (filters.side)
    query = query.eq("side", filters.side);

  // Map string status to the boolean is_open column
  if (filters.status === "open") {
    query = query.eq("is_open", true);
  } else if (filters.status === "closed") {
    query = query.eq("is_open", false);
  }

  const { data, count, error } = await query
    .order("opened_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as Position[], total: count ?? 0 };
}

export async function getOpenPositions(
  accountId: string
): Promise<Position[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from("positions")
    .select("*")
    .eq("trading_account_id", accountId)
    .eq("is_open", true)
    .order("opened_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Position[];
}

export async function getPositionById(id: string): Promise<Position | null> {
  const db = createServerSupabaseClient();
  const { data } = await db
    .from("positions")
    .select("*")
    .eq("id", id)
    .single();
  return data as Position | null;
}
