/**
 * Server-side executions service.
 *
 * Canonical table: executions
 *
 * Key field mappings vs old Terminal OS schema:
 *   quantity           → qty
 *   fill_price         → price
 *   provider_execution_id → broker_trade_id
 *
 * Columns removed (do not exist in live DB):
 *   fees, execution_status, provider, created_at
 *
 * Live DB extra columns (preserved in response):
 *   token, segment, exchange_timestamp, position_id, broker_trade_id
 */
import { createCanonicalAdminClient } from "@/lib/supabase/canonical-admin";
import type { Execution } from "@/types";

export interface ExecutionFilters {
  trading_account_id?: string;
  order_id?: string;
  symbol?: string;
  segment?: string;
  side?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export async function getExecutions(
  filters: ExecutionFilters = {}
): Promise<{ data: Execution[]; total: number }> {
  const db = createCanonicalAdminClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("executions").select("*", { count: "exact" });

  if (filters.trading_account_id)
    query = query.eq("account_id", filters.trading_account_id);
  if (filters.order_id)
    query = query.eq("order_id", filters.order_id);
  if (filters.symbol)
    query = query.ilike("symbol", `%${filters.symbol}%`);
  if (filters.segment)
    query = query.eq("segment", filters.segment);
  if (filters.side)
    query = query.eq("side", filters.side);
  // Use executed_at for date range — executed_at is the canonical timestamp
  if (filters.date_from)
    query = query.gte("executed_at", filters.date_from);
  if (filters.date_to)
    query = query.lte("executed_at", filters.date_to);

  const { data, count, error } = await query
    .order("executed_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapCanonicalExecution), total: count ?? 0 };
}

function mapCanonicalExecution(row: Record<string, unknown>): Execution {
  return {
    id: String(row.id), trading_account_id: String(row.account_id), order_id: String(row.order_id),
    position_id: typeof row.position_id === "string" ? row.position_id : null,
    broker_trade_id: typeof row.external_execution_id === "string" ? row.external_execution_id : null,
    symbol: String(row.symbol), token: "", segment: String(row.segment ?? row.exchange ?? ""),
    side: String(row.side).toUpperCase() as Execution["side"], qty: Number(row.quantity),
    price: Number(row.execution_price), exchange_timestamp: typeof row.executed_at === "string" ? row.executed_at : null,
    executed_at: String(row.executed_at),
  };
}

export async function getExecutionById(id: string): Promise<Execution | null> {
  const db = createCanonicalAdminClient();
  const { data } = await db
    .from("executions")
    .select("*")
    .eq("id", id)
    .single();
  return data ? mapCanonicalExecution(data as unknown as Record<string, unknown>) : null;
}
