/**
 * Server-side trading orders service.
 *
 * Canonical table: orders
 *
 * Canonical order fields are account_id, quantity, product, segment, and
 * submitted_at. Legacy trading_orders names must not be queried.
 */
import { createCanonicalAdminClient } from "@/lib/supabase/canonical-admin";
import type { Order } from "@/types";

export interface OrderFilters {
  trading_account_id?: string;
  symbol?: string;
  segment?: string;
  status?: string;
  side?: string;
  order_type?: string;
  product_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function getOrders(
  filters: OrderFilters = {}
): Promise<{ data: Order[]; total: number }> {
  const db = createCanonicalAdminClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("orders").select("*", { count: "exact" });

  if (filters.trading_account_id)
    query = query.eq("account_id", filters.trading_account_id);
  if (filters.symbol)
    query = query.ilike("symbol", `%${filters.symbol}%`);
  if (filters.segment)
    query = query.eq("segment", filters.segment);
  if (filters.status)
    query = query.eq("status", filters.status);
  if (filters.side)
    query = query.eq("side", filters.side);
  if (filters.order_type)
    query = query.eq("order_type", filters.order_type);
  if (filters.product_type)
    query = query.eq("product_type", filters.product_type);
  if (filters.date_from)
    query = query.gte("submitted_at", filters.date_from);
  if (filters.date_to)
    query = query.lte("submitted_at", filters.date_to);

  const { data, count, error } = await query
    .order("submitted_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapCanonicalOrder), total: count ?? 0 };
}

function mapCanonicalOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id), trading_account_id: String(row.account_id), broker_order_id: typeof row.external_order_id === "string" ? row.external_order_id : null,
    parent_order_id: typeof row.parent_order_id === "string" ? row.parent_order_id : null, order_group_id: null, order_group_type: null,
    symbol: String(row.symbol), token: "", segment: String(row.segment ?? row.exchange ?? ""), instrument_type: typeof row.instrument_type === "string" ? row.instrument_type : null,
    side: String(row.side).toUpperCase() as Order["side"], order_type: String(row.order_type), product_type: String(row.product ?? ""), validity: String(row.time_in_force ?? "DAY"),
    qty: Number(row.quantity), price: row.price == null ? null : Number(row.price), trigger_price: row.trigger_price == null ? null : Number(row.trigger_price),
    target_price: row.take_profit == null ? null : Number(row.take_profit), stoploss_price: row.stop_loss == null ? null : Number(row.stop_loss), trailing_sl: null,
    filled_qty: Number(row.filled_quantity ?? 0), pending_qty: Math.max(0, Number(row.quantity) - Number(row.filled_quantity ?? 0)),
    avg_fill_price: row.average_fill_price == null ? null : Number(row.average_fill_price), status: String(row.status), reject_reason: typeof row.rejection_reason === "string" ? row.rejection_reason : null,
    is_amo: false, placed_at: String(row.submitted_at ?? row.updated_at), filled_at: typeof row.completed_at === "string" ? row.completed_at : null,
    cancelled_at: typeof row.cancelled_at === "string" ? row.cancelled_at : null, updated_at: String(row.updated_at),
    idempotency_key: typeof row.client_order_id === "string" ? row.client_order_id : null, correlation_id: null,
  };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const db = createCanonicalAdminClient();
  const { data } = await db
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  return data ? mapCanonicalOrder(data as unknown as Record<string, unknown>) : null;
}

/**
 * Returns all executions for a given canonical order.
 */
export async function getOrderExecutions(orderId: string) {
  const db = createCanonicalAdminClient();
  const { data } = await db
    .from("executions")
    .select("*")
    .eq("order_id", orderId)
    .order("executed_at", { ascending: false });
  return data ?? [];
}
