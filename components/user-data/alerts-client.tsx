"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

const STATUS_OPTIONS = ["", "ACTIVE", "TRIGGERED", "DISABLED"];

async function fetchAlerts(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/alerts?${params}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export function AlertsClient() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["alerts", status, page],
    queryFn: () => fetchAlerts(params),
  });

  const alerts = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((s) => (
          <Button key={s} variant={status === s ? "default" : "outline"} size="sm" className="h-7 text-xs"
            onClick={() => { setStatus(s); setPage(1); }}>
            {s || "All"}
          </Button>
        ))}
        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r.id).slice(0, 8)}…</span> },
          { key: "trading_account_id", header: "Account", render: (r) => <span className="font-mono text-xs">{String(r.trading_account_id).slice(0, 10)}…</span> },
          { key: "alert_type", header: "Type", render: (r) => <span className="text-xs font-medium">{String(r.alert_type)}</span> },
          { key: "symbol", header: "Symbol", render: (r) => <span className="font-medium">{r.symbol ? String(r.symbol) : "—"}</span> },
          { key: "condition", header: "Condition", render: (r) => <span className="text-xs text-muted-foreground">{String(r.condition)}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
          { key: "triggered_at", header: "Triggered", render: (r) => <span className="text-xs text-muted-foreground">{r.triggered_at ? formatDateTime(String(r.triggered_at)) : "—"}</span> },
          { key: "created_at", header: "Created", render: (r) => <span className="text-xs text-muted-foreground">{formatRelativeTime(String(r.created_at))}</span> },
        ]}
        data={alerts}
        loading={isLoading}
        keyField="id"
        emptyTitle="No alerts found"
        emptyDescription="Trader alerts will appear here once created."
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
