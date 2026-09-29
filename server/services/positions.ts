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
import { createCanonicalAdminClient } from "@/lib/supabase/canonical-admin";
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
  const db = createCanonicalAdminClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("positions").select("*", { count: "exact" });

  if (filters.trading_account_id)
    query = query.eq("account_id", filters.trading_account_id);
  if (filters.symbol)
    query = query.ilike("symbol", `%${filters.symbol}%`);
  if (filters.segment)
    query = query.eq("exchange", filters.segment);
  if (filters.side)
    query = query.eq("side", filters.side);

  // Map string status to the boolean is_open column
  if (filters.status === "open") {
    query = query.eq("position_status", "open");
  } else if (filters.status === "closed") {
    query = query.eq("position_status", "closed");
  }

  const { data, count, error } = await query
    .order("opened_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapCanonicalPosition), total: count ?? 0 };
}

function mapCanonicalPosition(row: Record<string, unknown>): Position {
  return {
    id: String(row.id), trading_account_id: String(row.account_id), symbol: String(row.symbol), token: "",
    segment: String(row.exchange ?? ""), instrument_type: null, product_type: "", side: String(row.side).toUpperCase() as Position["side"],
    qty: Number(row.quantity), avg_price: Number(row.average_price), current_price: row.last_price == null ? null : Number(row.last_price),
    realized_pnl: Number(row.realized_pnl ?? 0), unrealized_pnl: Number(row.unrealized_pnl ?? 0),
    buy_qty: 0, sell_qty: 0, buy_avg: 0, sell_avg: 0, margin_used: 0,
    is_open: row.position_status === "open", opened_at: String(row.opened_at ?? row.updated_at),
    closed_at: typeof row.closed_at === "string" ? row.closed_at : "", updated_at: String(row.updated_at),
  };
}

export async function getOpenPositions(
  accountId: string
): Promise<Position[]> {
  const db = createCanonicalAdminClient();
  const { data, error } = await db
    .from("positions")
    .select("*")
    .eq("account_id", accountId)
    .eq("position_status", "open")
    .order("opened_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapCanonicalPosition);
}

export async function getPositionById(id: string): Promise<Position | null> {
  const db = createCanonicalAdminClient();
  const { data } = await db
    .from("positions")
    .select("*")
    .eq("id", id)
    .single();
  return data ? mapCanonicalPosition(data as unknown as Record<string, unknown>) : null;
}
