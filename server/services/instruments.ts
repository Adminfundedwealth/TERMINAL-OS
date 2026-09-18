import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Instrument } from "@/types";

export interface InstrumentFilters {
  exchange?: string;
  segment?: string;
  instrument_type?: string;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export async function getInstruments(
  filters: InstrumentFilters = {}
): Promise<{ data: Instrument[]; total: number }> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, filters.page_size ?? 50);
  const offset = (page - 1) * pageSize;

  let query = db.from("instruments").select("*", { count: "exact" });

  if (filters.exchange) query = query.eq("exchange", filters.exchange);
  if (filters.segment) query = query.eq("segment", filters.segment);
  if (filters.instrument_type) query = query.eq("instrument_type", filters.instrument_type);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.search)
    query = query.or(
      `symbol.ilike.%${filters.search}%,trading_symbol.ilike.%${filters.search}%`
    );

  const { data, count, error } = await query
    .order("symbol", { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as Instrument[], total: count ?? 0 };
}

export async function getInstrumentById(id: string): Promise<Instrument | null> {
  const db = createServerSupabaseClient();
  const { data } = await db.from("instruments").select("*").eq("id", id).single();
  return data as Instrument | null;
}

export async function getInstrumentStats() {
  const db = createServerSupabaseClient();
  const [total, active, exchanges] = await Promise.allSettled([
    db.from("instruments").select("id", { count: "exact", head: true }),
    db
      .from("instruments")
      .select("id", { count: "exact", head: true })
      .eq("status", "ACTIVE"),
    db.from("instruments").select("exchange").limit(1000),
  ]);

  const uniqueExchanges =
    exchanges.status === "fulfilled"
      ? new Set((exchanges.value.data ?? []).map((r: { exchange: string }) => r.exchange)).size
      : 0;

  return {
    total: total.status === "fulfilled" ? (total.value.count ?? 0) : 0,
    active: active.status === "fulfilled" ? (active.value.count ?? 0) : 0,
    exchanges: uniqueExchanges,
  };
}
