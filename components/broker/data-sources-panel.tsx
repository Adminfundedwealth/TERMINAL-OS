"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Zap, Radio, Globe, BarChart2, Server, Loader2 } from "lucide-react";

type SourceStatus = "online" | "warning" | "offline" | "unknown";

interface DataSource {
  id: string;
  label: string;
  sublabel: string;
  Icon: React.ElementType;
  status: SourceStatus;
  canTest: boolean;
}

const INITIAL: DataSource[] = [
  {
    id: "dhan_api",
    label: "Dhan API (Primary)",
    sublabel: "Click Test to verify - provides Option Chain, Greeks, Live Ticks",
    Icon: Zap,
    status: "unknown",
    canTest: true,
  },
  {
    id: "dhan_ws",
    label: "Dhan WebSocket",
    sublabel: "Requires Dhan credentials - Real-time index + VIX ticks",
    Icon: Radio,
    status: "unknown",
    canTest: false,
  },
  {
    id: "nse",
    label: "NSE India (Fallback)",
    sublabel: "Fallback - Indices, Sectors, A/D, Option Chain if Dhan fails",
    Icon: Globe,
    status: "unknown",
    canTest: false,
  },
  {
    id: "tv",
    label: "TradingView Scanner",
    sublabel: "No auth needed - 100+ F&O stocks LTP, Volume, Sectors",
    Icon: BarChart2,
    status: "unknown",
    canTest: false,
  },
  {
    id: "proxy",
    label: "Proxy Server",
    sublabel: "Routes all API traffic",
    Icon: Server,
    status: "unknown",
    canTest: false,
  },
];

const DOT_COLOR: Record<SourceStatus, string> = {
  online: "bg-emerald-500",
  warning: "bg-amber-500",
  offline: "bg-red-500",
  unknown: "bg-slate-500",
};

export function DataSourcesPanel() {
  const [sources, setSources] = useState<DataSource[]>(INITIAL);
  const [testing, setTesting] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const onlineCount = sources.filter((s) => s.status === "online").length;

  async function handleTest(id: string) {
    setTesting(id);
    setTestMsg(null);
    try {
      // Real test: try to hit the broker API
      const res = await fetch("/api/terminal/broker");
      if (res.ok) {
        const { data } = await res.json();
        const hasDhan = (data ?? []).some((r: { broker_id: string }) => r.broker_id === "dhan");
        if (hasDhan) {
          setSources((p) => p.map((s) => s.id === id ? { ...s, status: "online" } : s));
          setTestMsg("Dhan credentials found. Run a live connection test from the Connected tab.");
        } else {
          setSources((p) => p.map((s) => s.id === id ? { ...s, status: "offline" } : s));
          setTestMsg("No Dhan credentials saved yet. Add them in the Available tab.");
        }
      } else {
        setSources((p) => p.map((s) => s.id === id ? { ...s, status: "offline" } : s));
        setTestMsg("API check failed.");
      }
    } catch {
      setTestMsg("Connection check failed.");
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-cyan-400" />
            Connection Status
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time status of all data sources
          </p>
        </div>
        {onlineCount > 0 && (
          <span className="text-xs font-semibold text-muted-foreground">
            {onlineCount}/5 Online
          </span>
        )}
      </div>

      {/* Source rows */}
      <div className="divide-y divide-border/60">
        {sources.map(({ id, label, sublabel, Icon, status, canTest }) => (
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
                    DOT_COLOR[status]
                  )}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground leading-tight">{label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
                  {sublabel}
                </p>
              </div>
            </div>
            {canTest && (
              <button
                onClick={() => handleTest(id)}
                disabled={testing === id}
                className="shrink-0 text-xs font-medium text-foreground bg-transparent border border-border/80 hover:border-foreground/40 px-3 py-1 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
              >
                {testing === id && <Loader2 className="h-3 w-3 animate-spin" />}
                Test
              </button>
            )}
          </div>
        ))}
      </div>

      {testMsg && (
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground bg-muted/20">
          {testMsg}
        </div>
      )}
    </div>
  );
}
