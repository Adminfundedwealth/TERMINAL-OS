"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent, formatRelativeTime } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

const RISK_STATUS_OPTIONS = ["", "NORMAL", "WARNING", "CRITICAL", "BREACHED", "RESTRICTED"];

async function fetchMetrics(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/risk?view=metrics&${params}`);
  if (!res.ok) throw new Error("Failed to fetch metrics");
  return res.json();
}

export function RiskMetricsTable() {
  const [riskStatus, setRiskStatus] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (riskStatus) params.set("risk_status", riskStatus);
  params.set("page", String(page));
  params.set("page_size", "25");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["risk-metrics", riskStatus, page],
    queryFn: () => fetchMetrics(params),
    refetchInterval: 60_000,
  });

  const metrics = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {RISK_STATUS_OPTIONS.map((s) => (
          <Button
            key={s}
            variant={riskStatus === s ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setRiskStatus(s); setPage(1); }}
          >
            {s || "All"}
          </Button>
        ))}
        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          {
            key: "trading_account_id",
            header: "Account",
            render: (r) => <span className="font-mono text-xs">{String(r.trading_account_id).slice(0, 10)}…</span>,
          },
          {
            key: "balance",
            header: "Balance",
            className: "text-right",
            render: (r) => <span className="tabular-nums">{formatCurrency(Number(r.balance))}</span>,
          },
          {
            key: "equity",
            header: "Equity",
            className: "text-right",
            render: (r) => <span className="tabular-nums">{formatCurrency(Number(r.equity))}</span>,
          },
          {
            key: "daily_pnl",
            header: "Daily P&L",
            className: "text-right",
            render: (r) => {
              const v = Number(r.daily_pnl);
              return (
                <span className={`tabular-nums font-medium ${v >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatCurrency(v)}
                </span>
              );
            },
          },
          {
            key: "daily_loss_used",
            header: "Loss Used",
            className: "text-right",
            render: (r) => <span className="tabular-nums text-red-600 dark:text-red-400">{formatCurrency(Number(r.daily_loss_used))}</span>,
          },
          {
            key: "current_drawdown",
            header: "Drawdown",
            className: "text-right",
            render: (r) => <span className="tabular-nums">{formatPercent(Number(r.current_drawdown))}</span>,
          },
          {
            key: "exposure",
            header: "Exposure",
            className: "text-right",
            render: (r) => <span className="tabular-nums">{formatCurrency(Number(r.exposure))}</span>,
          },
          {
            key: "open_positions_count",
            header: "Positions",
            className: "text-right tabular-nums",
          },
          {
            key: "risk_status",
            header: "Risk Status",
            render: (r) => <StatusBadge status={String(r.risk_status)} />,
          },
          {
            key: "snapshot_at",
            header: "Updated",
            render: (r) => <span className="text-xs text-muted-foreground">{formatRelativeTime(String(r.snapshot_at))}</span>,
          },
        ]}
        data={metrics}
        loading={isLoading}
        keyField="id"
        emptyTitle="No metric snapshots found"
        emptyDescription="Account metric snapshots will appear once the risk service runs."
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
