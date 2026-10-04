"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";

const STATUS_OPTIONS = ["", "PENDING", "OPEN", "PARTIALLY_FILLED", "FILLED", "CANCELLED", "REJECTED", "EXPIRED"];
const SIDE_OPTIONS = ["", "BUY", "SELL"];

async function fetchOrders(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/orders?${params}`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export function OrdersListClient() {
  const router = useRouter();
  const [symbol, setSymbol] = useState("");
  const [status, setStatus] = useState("");
  const [side, setSide] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (symbol) params.set("symbol", symbol);
  if (status) params.set("status", status);
  if (side) params.set("side", side);
  params.set("page", String(page));
  params.set("page_size", "25");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["orders", symbol, status, side, page],
    queryFn: () => fetchOrders(params),
  });

  const orders = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Symbol…"
            value={symbol}
            onChange={(e) => { setSymbol(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <Button key={s} variant={status === s ? "default" : "outline"} size="sm" className="h-8 text-xs"
              onClick={() => { setStatus(s); setPage(1); }}>
              {s || "All Status"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {SIDE_OPTIONS.map((s) => (
            <Button key={s} variant={side === s ? "default" : "outline"} size="sm" className="h-8 text-xs"
              onClick={() => { setSide(s); setPage(1); }}>
              {s || "All Sides"}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "id", header: "Order ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r.id).slice(0,8)}…</span> },
          { key: "trading_account_id", header: "Account", render: (r) => <span className="font-mono text-xs">{String(r.trading_account_id).slice(0,8)}…</span> },
          { key: "symbol", header: "Symbol", render: (r) => <span className="font-medium">{String(r.symbol)}</span> },
          { key: "side", header: "Side", render: (r) => (
            <span className={String(r.side) === "BUY" ? "text-emerald-600 dark:text-emerald-400 font-medium text-xs" : "text-red-600 dark:text-red-400 font-medium text-xs"}>
              {String(r.side)}
            </span>
          )},
          { key: "order_type", header: "Type", render: (r) => <span className="text-xs text-muted-foreground">{String(r.order_type)}</span> },
          { key: "quantity", header: "Qty", className: "text-right tabular-nums", render: (r) => <span className="tabular-nums">{r.quantity != null ? String(r.quantity) : "—"}</span> },
          { key: "price", header: "Price", className: "text-right tabular-nums", render: (r) => <span className="tabular-nums">{r.price != null ? String(r.price) : "MKT"}</span> },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
          { key: "placed_at", header: "Placed", render: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(String(r.placed_at))}</span> },
        ]}
        data={orders}
        loading={isLoading}
        keyField="id"
        emptyTitle="No orders found"
        emptyDescription="Orders will appear here once placed."
        onRowClick={(r) => router.push(`/orders/${String(r.id)}`)}
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
