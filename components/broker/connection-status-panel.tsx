import { cn, formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { BrokerCredentialRow } from "@/types/broker";
import { getBrokerProvider } from "@/lib/brokers/provider-definitions";
import { Circle, Zap } from "lucide-react";

interface ConnectionStatusPanelProps {
  savedRows: BrokerCredentialRow[];
  loading: boolean;
}

export function ConnectionStatusPanel({ savedRows, loading }: ConnectionStatusPanelProps) {
  const onlineCount = savedRows.filter((r) => r.is_connected).length;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Connection Status
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time status of all saved broker configurations
          </p>
        </div>
        {!loading && savedRows.length > 0 && (
          <span className="text-xs font-medium text-emerald-400">
            {onlineCount}/{savedRows.length} Connected
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : savedRows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No broker credentials saved yet. Add one from the{" "}
          <strong>Available</strong> tab.
        </p>
      ) : (
        <div className="space-y-2">
          {savedRows.map((row) => {
            const provider = getBrokerProvider(row.broker_id);
            const isActive = row.is_active;
            const isConnected = row.is_connected;

            return (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2"
              >
                <div className="flex items-center gap-2.5">
                  <Circle
                    className={cn(
                      "h-2.5 w-2.5 fill-current shrink-0",
                      isConnected ? "text-emerald-500" : "text-muted-foreground/40"
                    )}
                    aria-hidden
                  />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {provider?.name ?? row.broker_id}
                      {isActive && (
                        <span className="ml-2 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          ACTIVE
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {provider?.runtimeIntegrated
                        ? isConnected
                          ? `Last tested: ${row.last_tested_at
                              ? formatRelativeTime(row.last_tested_at)
                              : "never"}`
                          : (row.last_test_result ?? "Not tested")
                        : "Configuration only - no runtime integration"}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    isConnected
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isConnected ? "Connected" : "Saved"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
