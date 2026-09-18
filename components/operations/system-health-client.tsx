"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

interface ServiceCheck {
  name: string;
  status: "HEALTHY" | "WARNING" | "CRITICAL" | "UNKNOWN";
  response_time_ms: number | null;
  last_success_at: string | null;
  last_error: string | null;
  checked_at: string;
}

const STATUS_CONFIG = {
  HEALTHY: { icon: CheckCircle2, label: "Healthy", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
  WARNING: { icon: AlertTriangle, label: "Warning", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/5 border-amber-500/20" },
  CRITICAL: { icon: XCircle, label: "Critical", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/5 border-red-500/20" },
  UNKNOWN: { icon: HelpCircle, label: "Unknown", color: "text-muted-foreground", bg: "bg-muted/30 border-border" },
};

const SERVICE_LABELS: Record<string, string> = {
  database: "Database",
  terminal_api: "Terminal API",
  market_data_providers: "Market Data Providers",
  websocket_service: "WebSocket Service",
  order_service: "Order Service",
  execution_service: "Execution Service",
  position_service: "Position Service",
  risk_service: "Risk Service",
  performance_service: "Performance Service",
  instrument_sync: "Instrument Sync",
};

async function fetchHealth() {
  const res = await fetch("/api/terminal/system-health");
  if (!res.ok) throw new Error("Failed to fetch health");
  return res.json();
}

export function SystemHealthClient() {
  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["system-health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const checks: ServiceCheck[] = data?.data ?? [];
  const checkedAt: string | null = data?.checked_at ?? null;

  const healthyCount = checks.filter((c) => c.status === "HEALTHY").length;
  const criticalCount = checks.filter((c) => c.status === "CRITICAL").length;
  const unknownCount = checks.filter((c) => c.status === "UNKNOWN").length;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-6 text-sm">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <strong>{healthyCount}</strong> Healthy
          </span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4" />
              <strong>{criticalCount}</strong> Critical
            </span>
          )}
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <strong>{unknownCount}</strong> Unknown
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {checkedAt && (
            <span className="text-xs text-muted-foreground">
              Checked {formatRelativeTime(checkedAt)}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Service cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {checks.map((check) => {
            const cfg = STATUS_CONFIG[check.status] ?? STATUS_CONFIG.UNKNOWN;
            const Icon = cfg.icon;
            return (
              <div
                key={check.name}
                className={cn("rounded-lg border p-4 space-y-3", cfg.bg)}
                role="article"
                aria-label={`${SERVICE_LABELS[check.name] ?? check.name} status`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {SERVICE_LABELS[check.name] ?? check.name}
                  </p>
                  <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", cfg.color)} aria-hidden />
                </div>

                <div className={cn("text-sm font-semibold", cfg.color)}>
                  {cfg.label}
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  {check.response_time_ms !== null && (
                    <p>Response: <span className="tabular-nums">{check.response_time_ms}ms</span></p>
                  )}
                  {check.last_success_at && (
                    <p>Last success: {formatRelativeTime(check.last_success_at)}</p>
                  )}
                  {check.last_error && (
                    <p className="text-red-600 dark:text-red-400 line-clamp-2">{check.last_error}</p>
                  )}
                  {check.status === "UNKNOWN" && !check.last_success_at && (
                    <p className="italic">Service health endpoint not yet connected</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Last update timestamp */}
      {dataUpdatedAt > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Auto-refreshes every 30 seconds · Last update: {new Date(dataUpdatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
