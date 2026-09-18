import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { RiskEventsListClient } from "@/components/risk/risk-events-list-client";

export const metadata: Metadata = { title: "Risk Events" };

export default function RiskEventsPage() {
  return (
    <div>
      <PageHeader
        title="Risk Events"
        description="Auditable log of all risk events across trading accounts"
      />
      <RiskEventsListClient />
    </div>
  );
}
