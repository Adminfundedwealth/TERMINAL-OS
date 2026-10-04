"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, pnlClass } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";

async function fetchPositions(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/positions?${params}`);
  if (!res.ok) throw new Error("Failed to fetch positions");
  return res.json();
}

export function PositionsListClient() {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (symbol) params.set("symbol", symbol);
  if (side) params.set("side", side);
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("page_size", "25");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["positions", symbol, side, status, page],
    queryFn: () => fetchPositions(params),
  });

  const positions = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Symbol…" value={symbol}
            onChange={(e) => { setSymbol(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm" />
        </div>
        {[["", "All Sides"], ["LONG", "Long"], ["SHORT", "Short"]].map(([val, label]) => (
          <Button key={val} variant={side === val ? "default" : "outline"} size="sm" className="h-8 text-xs"
            onClick={() => { setSide(val); setPage(1); }}>{label}</Button>
        ))}
        {[["OPEN", "Open"], ["CLOSED", "Closed"], ["", "All"]].map(([val, label]) => (
          <Button key={val} variant={status === val ? "default" : "outline"} size="sm" className="h-8 text-xs"
            onClick={() => { setStatus(val); setPage(1); }}>{label}</Button>
        ))}
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "trading_account_id", header: "Account", render: (r) => <span className="font-mono text-xs">{String(r.trading_account_id).slice(0, 8)}…</span> },
          { key: "symbol", header: "Symbol", render: (r) => <span className="font-medium">{String(r.symbol)}</span> },
          { key: "exchange", header: "Exchange", render: (r) => <span className="text-xs text-muted-foreground">{String(r.exchange)}</span> },
          { key: "side", header: "Side", render: (r) => <StatusBadge status={String(r.side)} /> },
          { key: "quantity", header: "Qty", className: "text-right tabular-nums", render: (r) => <span className="tabular-nums">{r.quantity != null ? Number(r.quantity) : "—"}</span> },
          { key: "average_price", header: "Avg Price", className: "text-right", render: (r) => <span className="tabular-nums">{r.average_price != null ? formatCurrency(Number(r.average_price)) : "—"}</span> },
          { key: "ltp", header: "LTP", className: "text-right", render: (r) => <span className="tabular-nums">{r.ltp ? formatCurrency(Number(r.ltp)) : "—"}</span> },
          { key: "unrealized_pnl", header: "Unrealized P&L", className: "text-right",
            render: (r) => <span className={`tabular-nums font-medium ${pnlClass(Number(r.unrealized_pnl))}`}>{r.unrealized_pnl != null ? formatCurrency(Number(r.unrealized_pnl)) : "—"}</span> },
          { key: "realized_pnl", header: "Realized P&L", className: "text-right",
            render: (r) => <span className={`tabular-nums font-medium ${pnlClass(Number(r.realized_pnl))}`}>{formatCurrency(Number(r.realized_pnl))}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
          { key: "opened_at", header: "Opened", render: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(String(r.opened_at))}</span> },
        ]}
        data={positions}
        loading={isLoading}
        keyField="id"
        emptyTitle="No positions found"
        emptyDescription="Positions will appear here when trades are placed."
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
