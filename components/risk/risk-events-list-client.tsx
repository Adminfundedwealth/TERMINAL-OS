"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";

const SEVERITY_OPTIONS = ["", "INFO", "WARNING", "CRITICAL"];
const EVENT_TYPES = [
  "", "DAILY_LOSS_WARNING", "DAILY_LOSS_BREACH",
  "MAX_DRAWDOWN_WARNING", "MAX_DRAWDOWN_BREACH",
  "EXPOSURE_WARNING", "POSITION_LIMIT", "TRADING_RESTRICTION",
];

async function fetchRiskEvents(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/risk/events?${params}`);
  if (!res.ok) throw new Error("Failed to fetch risk events");
  return res.json();
}

export function RiskEventsListClient() {
  const [accountId, setAccountId] = useState("");
  const [severity, setSeverity] = useState("");
  const [eventType, setEventType] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (accountId) params.set("account_id", accountId);
  if (severity) params.set("severity", severity);
  if (eventType) params.set("event_type", eventType);
  params.set("page", String(page));
  params.set("page_size", "25");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["risk-events", accountId, severity, eventType, page],
    queryFn: () => fetchRiskEvents(params),
  });

  const events = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Account ID…"
            value={accountId}
            onChange={(e) => { setAccountId(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_OPTIONS.map((s) => (
            <Button key={s} variant={severity === s ? "default" : "outline"} size="sm" className="h-7 text-xs"
              onClick={() => { setSeverity(s); setPage(1); }}>
              {s || "All Severity"}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_TYPES.map((t) => (
            <Button key={t} variant={eventType === t ? "default" : "outline"} size="sm" className="h-7 text-xs"
              onClick={() => { setEventType(t); setPage(1); }}>
              {t ? t.replace(/_/g, " ") : "All Types"}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r.id).slice(0, 8)}…</span> },
          { key: "trading_account_id", header: "Account", render: (r) => <span className="font-mono text-xs">{String(r.trading_account_id).slice(0, 10)}…</span> },
          { key: "event_type", header: "Event", render: (r) => <span className="text-xs font-medium">{String(r.event_type).replace(/_/g, " ")}</span> },
          { key: "severity", header: "Severity", render: (r) => <StatusBadge status={String(r.severity)} /> },
          { key: "metric", header: "Metric", render: (r) => <span className="text-xs text-muted-foreground">{String(r.metric)}</span> },
          { key: "actual_value", header: "Actual", className: "text-right tabular-nums" },
          { key: "threshold", header: "Threshold", className: "text-right tabular-nums" },
          { key: "action_taken", header: "Action", render: (r) => <span className="text-xs text-muted-foreground">{String(r.action_taken ?? "—")}</span> },
          { key: "created_by", header: "By", render: (r) => <span className="text-xs text-muted-foreground">{String(r.created_by ?? "SYSTEM")}</span> },
          { key: "created_at", header: "Time", render: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(String(r.created_at))}</span> },
        ]}
        data={events}
        loading={isLoading}
        keyField="id"
        emptyTitle="No risk events found"
        emptyDescription="Risk events will be recorded here when triggered by the risk engine."
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
