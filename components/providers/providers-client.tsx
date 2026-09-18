"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, cn } from "@/lib/utils";
import { Server, RefreshCw } from "lucide-react";

interface ProviderRow {
  id: string;
  provider_name: string;
  provider_type: string;
  environment: string;
  is_active: boolean;
  status: string;
  last_heartbeat_at: string | null;
  last_success_at: string | null;
  last_error_message: string | null;
}

const STATUS_DOT: Record<string, string> = {
  CONNECTED: "bg-emerald-500",
  DISCONNECTED: "bg-muted-foreground",
  ERROR: "bg-red-500",
  UNKNOWN: "bg-amber-500",
};

async function fetchProviders(): Promise<{ data: ProviderRow[] }> {
  const res = await fetch("/api/terminal/providers");
  if (!res.ok) throw new Error("Failed to fetch providers");
  return res.json();
}

export function ProvidersClient() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
    refetchInterval: 60_000,
  });

  const providers = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No providers configured"
          description="Add provider configuration to the provider_config table in Terminal Supabase #2."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) => (
            <Card key={p.id} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn("h-2.5 w-2.5 rounded-full shrink-0", STATUS_DOT[p.status] ?? "bg-muted-foreground")}
                      aria-hidden
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.provider_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.provider_type}</p>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Environment</span>
                    <span className="font-medium">{p.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Active</span>
                    <span className={p.is_active ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                      {p.is_active ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Heartbeat</span>
                    <span>{p.last_heartbeat_at ? formatRelativeTime(p.last_heartbeat_at) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Success</span>
                    <span>{p.last_success_at ? formatRelativeTime(p.last_success_at) : "—"}</span>
                  </div>
                  {p.last_error_message && (
                    <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/20 px-2 py-1.5 text-red-600 dark:text-red-400">
                      {p.last_error_message}
                    </div>
                  )}
                </div>

                <p className="mt-3 text-[10px] text-muted-foreground/60 border-t border-border pt-2">
                  Credentials are server-side only — not displayed here
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
