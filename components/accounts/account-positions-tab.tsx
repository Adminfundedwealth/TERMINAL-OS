import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, pnlClass } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import type { Position } from "@/types";

export async function AccountPositionsTab({ accountId }: { accountId: string }) {
  const db = createServerSupabaseClient();
  const { data } = await db
    .from("positions")
    .select("*")
    .eq("trading_account_id", accountId)
    .eq("is_open", true)          // live DB uses boolean, not status string
    .order("opened_at", { ascending: false });

  const positions = (data ?? []) as Position[];

  if (positions.length === 0) {
    return (
      <EmptyState icon={TrendingUp} title="No open positions" description="Open positions for this account will appear here." />
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-xs" aria-label="Account positions">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {["Symbol", "Segment", "Side", "Product", "Qty", "Avg Price", "Current Price", "Unrealized P&L", "Realized P&L"].map((h) => (
              <th key={h} scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">{p.symbol}</td>
              <td className="px-3 py-2 text-muted-foreground">{p.segment}</td>
              <td className="px-3 py-2"><StatusBadge status={p.side} /></td>
              <td className="px-3 py-2 text-muted-foreground">{p.product_type}</td>
              <td className="px-3 py-2 tabular-nums">{p.qty}</td>
              <td className="px-3 py-2 tabular-nums">{formatCurrency(p.avg_price)}</td>
              <td className="px-3 py-2 tabular-nums">
                {p.current_price != null ? formatCurrency(p.current_price) : "—"}
              </td>
              <td className={`px-3 py-2 tabular-nums font-medium ${pnlClass(p.unrealized_pnl)}`}>
                {formatCurrency(p.unrealized_pnl)}
              </td>
              <td className={`px-3 py-2 tabular-nums font-medium ${pnlClass(p.realized_pnl)}`}>
                {formatCurrency(p.realized_pnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
