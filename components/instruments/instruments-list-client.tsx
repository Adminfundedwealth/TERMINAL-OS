"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";

const EXCHANGES = ["", "NSE", "BSE", "MCX", "CDS"];
const TYPES = ["", "EQ", "FUT", "OPT", "INDEX", "CURRENCY", "COMMODITY"];

async function fetchInstruments(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/instruments?${params}`);
  if (!res.ok) throw new Error("Failed to fetch instruments");
  return res.json();
}

export function InstrumentsListClient() {
  const [search, setSearch] = useState("");
  const [exchange, setExchange] = useState("");
  const [instrType, setInstrType] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (exchange) params.set("exchange", exchange);
  if (instrType) params.set("instrument_type", instrType);
  params.set("page", String(page));
  params.set("page_size", "50");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["instruments", search, exchange, instrType, page],
    queryFn: () => fetchInstruments(params),
    staleTime: 300_000,
  });

  const instruments = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search symbol…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {EXCHANGES.map((ex) => (
            <Button key={ex} variant={exchange === ex ? "default" : "outline"} size="sm" className="h-7 text-xs"
              onClick={() => { setExchange(ex); setPage(1); }}>
              {ex || "All Exchanges"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TYPES.map((t) => (
            <Button key={t} variant={instrType === t ? "default" : "outline"} size="sm" className="h-7 text-xs"
              onClick={() => { setInstrType(t); setPage(1); }}>
              {t || "All Types"}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "symbol", header: "Symbol", render: (r) => <span className="font-medium">{String(r.symbol)}</span> },
          { key: "trading_symbol", header: "Trading Symbol", render: (r) => <span className="font-mono text-xs">{String(r.trading_symbol)}</span> },
          { key: "exchange", header: "Exchange", render: (r) => <span className="text-xs">{String(r.exchange)}</span> },
          { key: "segment", header: "Segment", render: (r) => <span className="text-xs text-muted-foreground">{String(r.segment)}</span> },
          { key: "instrument_type", header: "Type", render: (r) => <StatusBadge status={String(r.instrument_type)} /> },
          { key: "expiry", header: "Expiry", render: (r) => <span className="text-xs text-muted-foreground">{r.expiry ? formatDate(String(r.expiry)) : "—"}</span> },
          { key: "strike", header: "Strike", className: "text-right tabular-nums", render: (r) => <span>{r.strike ? String(r.strike) : "—"}</span> },
          { key: "option_type", header: "Opt", render: (r) => <span className="text-xs">{r.option_type ? String(r.option_type) : "—"}</span> },
          { key: "lot_size", header: "Lot", className: "text-right tabular-nums" },
          { key: "tick_size", header: "Tick", className: "text-right tabular-nums" },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
        ]}
        data={instruments}
        loading={isLoading}
        keyField="id"
        emptyTitle="No instruments found"
        emptyDescription="Instruments will appear once the instrument master is synced from your provider."
        total={total}
        page={page}
        pageSize={50}
        onPageChange={setPage}
      />
    </div>
  );
}
