"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { RefreshCw, Radio, Globe, BarChart2, Server, Zap } from "lucide-react";

type SourceStatus = "ONLINE" | "OFFLINE" | "ERROR" | "NOT_IMPLEMENTED";

interface DataSourceHealth {
  id: string;
  status: SourceStatus;
  detail: string;
  response_time_ms: number | null;
}

const SOURCE_DETAILS: Record<string, { label: string; Icon: React.ElementType }> = {
  terminal_api: { label: "Terminal OS API", Icon: Server },
  nse: { label: "NSE fallback", Icon: Globe },
  tradingview: { label: "TradingView Scanner", Icon: BarChart2 },
  dhan: { label: "Dhan API", Icon: Zap },
  dhan_websocket: { label: "Dhan WebSocket", Icon: Radio },
};

const STATUS_STYLE: Record<SourceStatus, { color: string; dot: string }> = {
  ONLINE: { color: "text-emerald-400", dot: "bg-emerald-500" },
  OFFLINE: { color: "text-slate-400", dot: "bg-slate-500" },
  ERROR: { color: "text-red-400", dot: "bg-red-500" },
  NOT_IMPLEMENTED: { color: "text-amber-400", dot: "bg-amber-500" },
};

export function DataSourcesPanel({ accountId }: { accountId: string }) {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["market-data-health", accountId],
    queryFn: async () => {
      const query = new URLSearchParams({ account_id: accountId });
      const response = await fetch(`/api/terminal/market-data/health?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Market-data health request failed.");
      return response.json() as Promise<{ data: DataSourceHealth[] }>;
    },
    enabled: Boolean(accountId),
    retry: false,
    refetchInterval: 30_000,
  });

  const sourceRows = (data?.data ?? []).map((source) => ({
    ...source,
    ...(SOURCE_DETAILS[source.id] ?? { label: source.id, Icon: Server }),
  }));
  const onlineCount = sourceRows.filter((source) => source.status === "ONLINE").length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            Connection Status
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live checks; Dhan status uses its most recent explicit authentication test.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground">ONLINE {onlineCount}/5</span>
          <button
            aria-label="Refresh service health"
            title="Refresh service health"
            onClick={() => void refetch()}
            disabled={isFetching || !accountId}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {sourceRows.map(({ id, label, Icon, status, detail, response_time_ms }) => (
          <div
            key={id}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Icon with status dot */}
              <div className="relative shrink-0 w-5 h-5 flex items-center justify-center">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-card",
                    STATUS_STYLE[status].dot
                  )}
                />
              </div>
              <div className="min-w-0">
                <p className={cn("text-xs font-medium leading-tight", STATUS_STYLE[status].color)}>{label} · {status}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  {response_time_ms === null ? detail : `${detail} (${response_time_ms} ms)`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!accountId && <p className="px-4 py-2 text-xs text-muted-foreground">Select an active trading account to inspect Dhan status.</p>}
      {isLoading && <p className="px-4 py-2 text-xs text-muted-foreground">Checking service health…</p>}
      {isError && <p className="px-4 py-2 text-xs text-red-400">Health checks could not be loaded.</p>}
    </div>
  );
}
