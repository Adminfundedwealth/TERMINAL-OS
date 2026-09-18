"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, pnlClass } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";

async function fetchExecutions(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/executions?${params}`);
  if (!res.ok) throw new Error("Failed to fetch executions");
  return res.json();
}

export function ExecutionsListClient() {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (symbol) params.set("symbol", symbol);
  if (side) params.set("side", side);
  params.set("page", String(page));
  params.set("page_size", "25");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["executions", symbol, side, page],
    queryFn: () => fetchExecutions(params),
  });

  const executions = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Symbol…" value={symbol} onChange={(e) => { setSymbol(e.target.value); setPage(1); }} className="pl-8 h-8 text-sm" />
        </div>
        {["", "BUY", "SELL"].map((s) => (
          <Button key={s} variant={side === s ? "default" : "outline"} size="sm" className="h-8 text-xs"
            onClick={() => { setSide(s); setPage(1); }}>
            {s || "All Sides"}
          </Button>
        ))}
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "id", header: "Execution ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r.id).slice(0, 8)}…</span> },
          { key: "order_id", header: "Order ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r.order_id).slice(0, 8)}…</span> },
          { key: "trading_account_id", header: "Account", render: (r) => <span className="font-mono text-xs">{String(r.trading_account_id).slice(0, 8)}…</span> },
          { key: "symbol", header: "Symbol", render: (r) => <span className="font-medium">{String(r.symbol)}</span> },
          { key: "side", header: "Side", render: (r) => (
            <span className={String(r.side) === "BUY" ? "text-emerald-600 dark:text-emerald-400 font-medium text-xs" : "text-red-600 dark:text-red-400 font-medium text-xs"}>
              {String(r.side)}
            </span>
          )},
          { key: "quantity", header: "Qty", className: "text-right tabular-nums" },
          { key: "fill_price", header: "Fill Price", className: "text-right", render: (r) => <span className="tabular-nums">{formatCurrency(Number(r.fill_price))}</span> },
          { key: "fees", header: "Fees", className: "text-right", render: (r) => <span className={`tabular-nums ${pnlClass(-Number(r.fees))}`}>{formatCurrency(Number(r.fees))}</span> },
          { key: "execution_status", header: "Status", render: (r) => <StatusBadge status={String(r.execution_status)} /> },
          { key: "provider", header: "Provider", render: (r) => <span className="text-xs text-muted-foreground">{String(r.provider ?? "—")}</span> },
          { key: "executed_at", header: "Executed", render: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(String(r.executed_at))}</span> },
        ]}
        data={executions}
        loading={isLoading}
        keyField="id"
        emptyTitle="No executions found"
        emptyDescription="Trade executions will appear here."
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
