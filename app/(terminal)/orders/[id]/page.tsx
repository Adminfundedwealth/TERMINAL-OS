import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderById, getOrderExecutions } from "@/server/services/orders";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ChevronRight, Zap } from "lucide-react";
import type { Execution } from "@/types";

interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrderById(id);
  return { title: order ? `Order ${order.id.slice(0, 8)}` : "Order Not Found" };
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [order, execs] = await Promise.all([
    getOrderById(id),
    getOrderExecutions(id),
  ]);
  const executions = (execs ?? []) as Execution[];
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/orders" className="hover:text-foreground">Orders</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-mono">{order.id.slice(0, 12)}…</span>
      </nav>

      <PageHeader
        title={`Order — ${order.symbol}`}
        description={`Account: ${order.trading_account_id}`}
        actions={<StatusBadge status={order.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["Order ID", <span key="id" className="font-mono text-xs">{order.id}</span>],
              ["Symbol", order.symbol],
              ["Segment", order.segment],
              ["Instrument Type", order.instrument_type ?? "—"],
              ["Side", <span key="side" className={order.side === "BUY" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>{order.side}</span>],
              ["Order Type", order.order_type],
              ["Product Type", order.product_type],
              ["Validity", order.validity],
              ["Qty", String(order.qty)],
              ["Filled Qty", String(order.filled_qty)],
              ["Avg Fill Price", order.avg_fill_price ? formatCurrency(order.avg_fill_price) : "—"],
              ["Price", order.price ? formatCurrency(order.price) : "Market"],
              ["Trigger Price", order.trigger_price ? formatCurrency(order.trigger_price) : "—"],
              ["Status", <StatusBadge key="st" status={order.status} />],
              ["Reject Reason", order.reject_reason ?? "—"],
              ["Broker Order ID", order.broker_order_id ?? "—"],
              ["Placed At", formatDateTime(order.placed_at)],
              ["Updated At", formatDateTime(order.updated_at)],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground shrink-0">{label}</span>
                <span className="text-right font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Executions ({executions.length})</CardTitle></CardHeader>
          <CardContent>
            {executions.length === 0 ? (
              <EmptyState icon={Zap} title="No executions" description="This order has no executions yet." />
            ) : (
              <div className="space-y-2">
                {executions.map((ex) => (
                  <div key={ex.id} className="rounded-md border border-border p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-mono text-muted-foreground">{String(ex.id).slice(0, 12)}…</span>
                      <span className="text-muted-foreground">{ex.segment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fill Price</span>
                      <span className="tabular-nums font-medium">{formatCurrency(ex.price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Qty</span>
                      <span className="tabular-nums">{ex.qty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Broker Trade ID</span>
                      <span className="font-mono">{ex.broker_trade_id ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exchange Timestamp</span>
                      <span>{ex.exchange_timestamp ? formatDateTime(ex.exchange_timestamp) : "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Executed</span>
                      <span>{formatDateTime(ex.executed_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
