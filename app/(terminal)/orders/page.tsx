import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { OrdersListClient } from "@/components/orders/orders-list-client";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <div>
      <PageHeader title="Orders" description="All orders across all trading accounts" />
      <OrdersListClient />
    </div>
  );
}
