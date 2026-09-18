import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

// Uses trading_orders — NOT the payment `orders` table
type OrderRow = {
  id: string;
  symbol: string;
  segment: string;
  side: string;
  order_type: string;
  product_type: string;
  qty: number;
  price: number | null;
  status: string;
  placed_at: string;
};

export async function AccountOrdersTab({ accountId }: { accountId: string }) {
  const db = createServerSupabaseClient();
  const { data } = await db
    .from("trading_orders")
    .select("id, symbol, segment, side, order_type, product_type, qty, price, status, placed_at")
    .eq("trading_account_id", accountId)
    .order("placed_at", { ascending: false })
    .limit(20);

  const orders = (data ?? []) as OrderRow[];

  if (orders.length === 0) {
    return (
      <EmptyState icon={ClipboardList} title="No orders" description="Orders for this account will appear here." />
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-xs" aria-label="Account orders">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {["Symbol", "Segment", "Side", "Type", "Product", "Qty", "Price", "Status", "Placed"].map((h) => (
              <th key={h} scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="px-3 py-2">
                <Link href={`/orders/${o.id}`} className="text-primary hover:underline font-medium">{o.symbol}</Link>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{o.segment}</td>
              <td className="px-3 py-2">
                <span className={o.side === "BUY" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                  {o.side}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{o.order_type}</td>
              <td className="px-3 py-2 text-muted-foreground">{o.product_type}</td>
              <td className="px-3 py-2 tabular-nums">{o.qty}</td>
              <td className="px-3 py-2 tabular-nums">{o.price ?? "MKT"}</td>
              <td className="px-3 py-2"><StatusBadge status={o.status} /></td>
              <td className="px-3 py-2 text-muted-foreground">{formatDateTime(o.placed_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
