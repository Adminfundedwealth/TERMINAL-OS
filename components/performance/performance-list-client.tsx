"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatNumber, formatPercent, pnlClass } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";

async function fetchPerformance(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/performance?${params}`);
  if (!res.ok) throw new Error("Failed to fetch performance");
  return res.json();
}

export function PerformanceListClient() {
  const [accountId, setAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (accountId) params.set("account_id", accountId);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  params.set("page", String(page));
  params.set("page_size", "31");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["performance", accountId, dateFrom, dateTo, page],
    queryFn: () => fetchPerformance(params),
  });

  const rows = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter by Account ID…"
            value={accountId}
            onChange={(e) => { setAccountId(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="h-8 text-sm w-36"
            aria-label="From date"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="h-8 text-sm w-36"
            aria-label="To date"
          />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          {
            key: "date",
            header: "Date",
            render: (r) => <span className="font-medium">{formatDate(String(r.date))}</span>,
          },
          {
            key: "trading_account_id",
            header: "Account",
            render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r.trading_account_id).slice(0, 10)}…</span>,
          },
          {
            key: "opening_balance",
            header: "Opening",
            className: "text-right",
            render: (r) => <span className="tabular-nums">{formatCurrency(r.opening_balance == null ? null : Number(r.opening_balance))}</span>,
          },
          {
            key: "closing_balance",
            header: "Closing",
            className: "text-right",
            render: (r) => <span className="tabular-nums">{formatCurrency(r.closing_balance == null ? null : Number(r.closing_balance))}</span>,
          },
          {
            key: "daily_pnl",
            header: "Daily P&L",
            className: "text-right",
            render: (r) => (
              <span className={`tabular-nums font-semibold ${pnlClass(Number(r.daily_pnl))}`}>
                {formatCurrency(Number(r.daily_pnl))}
              </span>
            ),
          },
          {
            key: "total_trades",
            header: "Trades",
            className: "text-right tabular-nums",
            render: (r) => <span>{formatNumber(Number(r.total_trades))}</span>,
          },
          {
            key: "winning_trades",
            header: "Wins",
            className: "text-right tabular-nums text-emerald-600 dark:text-emerald-400",
          },
          {
            key: "losing_trades",
            header: "Losses",
            className: "text-right tabular-nums text-red-600 dark:text-red-400",
          },
          {
            key: "win_rate",
            header: "Win Rate",
            className: "text-right",
            render: (r) => {
              const trades = Number(r.total_trades);
              const wins = Number(r.winning_trades);
              const rate = trades > 0 ? (wins / trades) * 100 : null;
              return <span className="tabular-nums">{rate !== null ? formatPercent(rate) : "—"}</span>;
            },
          },
          {
            key: "fees",
            header: "Fees",
            className: "text-right",
            render: (r) => <span className="tabular-nums text-muted-foreground">{r.fees == null ? "—" : formatCurrency(Number(r.fees))}</span>,
          },
        ]}
        data={rows}
        loading={isLoading}
        keyField="id"
        emptyTitle="No performance data found"
        emptyDescription="Daily performance records will appear here once trading activity is recorded."
        total={total}
        page={page}
        pageSize={31}
        onPageChange={setPage}
      />
    </div>
  );
}
