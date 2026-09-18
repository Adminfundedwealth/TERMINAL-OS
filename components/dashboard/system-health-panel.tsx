import { cn } from "@/lib/utils";
import type { SystemHealthSummary, ServiceHealthStatus } from "@/types";
import { Database, Activity, Radio, Zap, ShieldAlert } from "lucide-react";

interface SystemHealthPanelProps {
  health: SystemHealthSummary;
}

const SERVICE_CONFIG = [
  { key: "database" as const, label: "Database", icon: Database },
  { key: "market_data" as const, label: "Market Data", icon: Activity },
  { key: "websocket" as const, label: "WebSocket", icon: Radio },
  { key: "order_service" as const, label: "Order Service", icon: Zap },
  { key: "risk_service" as const, label: "Risk Service", icon: ShieldAlert },
];

const STATUS_CONFIG: Record<
  ServiceHealthStatus,
  { label: string; dotClass: string; textClass: string; bgClass: string }
> = {
  HEALTHY: {
    label: "Healthy",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/5 border-emerald-500/20",
  },
  WARNING: {
    label: "Warning",
    dotClass: "bg-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/5 border-amber-500/20",
  },
  CRITICAL: {
    label: "Critical",
    dotClass: "bg-red-500",
    textClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-500/5 border-red-500/20",
  },
  UNKNOWN: {
    label: "Unknown",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
    bgClass: "bg-muted/30 border-border",
  },
};

export function SystemHealthPanel({ health }: SystemHealthPanelProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {SERVICE_CONFIG.map(({ key, label, icon: Icon }) => {
        const status = health[key];
        const cfg = STATUS_CONFIG[status];
        return (
          <div
            key={key}
            className={cn(
              "rounded-lg border p-4 flex flex-col items-center gap-2 text-center",
              cfg.bgClass
            )}
          >
            <Icon className={cn("h-5 w-5", cfg.textClass)} aria-hidden />
            <div>
              <p className="text-xs font-medium text-foreground">{label}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span
                  className={cn("inline-block h-1.5 w-1.5 rounded-full", cfg.dotClass)}
                  aria-hidden
                />
                <span className={cn("text-[10px] font-medium", cfg.textClass)}>
                  {cfg.label}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
