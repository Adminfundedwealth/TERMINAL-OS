import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";
import { getRiskEvents } from "@/server/services/risk";

export async function AccountRiskTab({ accountId }: { accountId: string }) {
  const { data: events } = await getRiskEvents({ trading_account_id: accountId, page: 1, page_size: 10 });

  if (events.length === 0) {
    return (
      <EmptyState icon={ShieldAlert} title="No risk events" description="Risk events for this account will appear here." />
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-xs" aria-label="Account risk events">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {["Event", "Severity", "Metric", "Actual", "Threshold", "Action", "Time"].map((h) => (
              <th key={h} scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">{e.event_type.replace(/_/g, " ")}</td>
              <td className="px-3 py-2"><StatusBadge status={e.severity} /></td>
              <td className="px-3 py-2 text-muted-foreground">{e.rule_type}</td>
              <td className="px-3 py-2 tabular-nums">{e.actual_value}</td>
              <td className="px-3 py-2 tabular-nums">{e.threshold_value ?? "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{e.metadata.action_taken ? String(e.metadata.action_taken) : "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{formatDateTime(e.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
