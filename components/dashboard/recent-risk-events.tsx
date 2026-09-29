import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

interface RecentRiskEvent {
  id: string;
  trading_account_id: string;
  event_type: string;
  severity: string;
  metric: string;
  actual_value: number | null;
  threshold: number | null;
  created_at: string;
}

export function RecentRiskEvents({ events }: { events: RecentRiskEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No risk events"
        description="Risk events will appear here when triggered."
      />
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          className="rounded-md border border-border bg-card p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {event.event_type.replace(/_/g, " ")}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Account: {event.trading_account_id.slice(0, 8)}…
              </p>
            </div>
            <StatusBadge status={event.severity} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {event.metric}: {event.actual_value ?? "—"} / {event.threshold ?? "—"}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(event.created_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
