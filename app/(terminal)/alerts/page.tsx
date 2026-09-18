import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AlertsClient } from "@/components/user-data/alerts-client";

export const metadata: Metadata = { title: "Alerts" };

export default function AlertsPage() {
  return (
    <div>
      <PageHeader title="Alerts" description="Price and condition alerts across all accounts" />
      <AlertsClient />
    </div>
  );
}
