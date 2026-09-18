import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

interface RecentOrder {
  id: string;
  trading_account_id: string;
  symbol: string;
  side: string;
  order_type: string;
  quantity: number;
  status: string;
  placed_at: string;
}

export function RecentOrdersTable({ orders }: { orders: RecentOrder[] }) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No orders today"
        description="Orders placed today will appear here."
      />
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-xs" aria-label="Recent orders">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide">Symbol</th>
            <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide">Side</th>
            <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide">Status</th>
            <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground uppercase tracking-wide">Qty</th>
            <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground uppercase tracking-wide">Time</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-3 py-2.5">
                <Link href={`/orders/${order.id}`} className="font-medium text-primary hover:underline">
                  {order.symbol}
                </Link>
              </td>
              <td className="px-3 py-2.5">
                <span className={order.side === "BUY" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                  {order.side}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{order.quantity}</td>
              <td className="px-3 py-2.5 text-right text-muted-foreground">{formatRelativeTime(order.placed_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
