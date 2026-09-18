/**
 * Server-side trading orders service.
 *
 * Canonical table: trading_orders
 *
 * IMPORTANT: The `orders` table in this database is the PAYMENT/checkout
 * orders table (plan purchases, UTR references, etc.). It must NEVER be
 * used here. All trading orders live in `trading_orders`.
 *
 * Key field mappings vs old Terminal OS schema:
 *   "orders"          → "trading_orders"   (table name)
 *   quantity          → qty
 *   provider_order_id → broker_order_id
 *   exchange          → segment            (live DB uses segment: NSE/NFO/CDS/MCX)
 *   source            → (removed — column does not exist)
 */
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  // Query trading_orders — NOT the payment `orders` table
  let query = db.from("trading_orders").select("*", { count: "exact" });

  if (filters.trading_account_id)
    query = query.eq("trading_account_id", filters.trading_account_id);
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
    query = query.gte("placed_at", filters.date_from);
  if (filters.date_to)
    query = query.lte("placed_at", filters.date_to);

  const { data, count, error } = await query
    .order("placed_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as Order[], total: count ?? 0 };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const db = createServerSupabaseClient();
  const { data } = await db
    .from("trading_orders")
    .select("*")
    .eq("id", id)
    .single();
  return data as Order | null;
}

/**
 * Returns all executions for a given trading order.
 * Both trading_orders.id and executions.order_id are UUIDs — direct FK match.
 */
export async function getOrderExecutions(orderId: string) {
  const db = createServerSupabaseClient();
  const { data } = await db
    .from("executions")
    .select("*")
    .eq("order_id", orderId)
    .order("executed_at", { ascending: false });
  return data ?? [];
}
