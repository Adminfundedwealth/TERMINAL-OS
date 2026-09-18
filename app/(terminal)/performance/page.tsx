import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PerformanceListClient } from "@/components/performance/performance-list-client";

export const metadata: Metadata = { title: "Daily Performance" };

export default function PerformancePage() {
  return (
    <div>
      <PageHeader
        title="Daily Performance"
        description="Daily P&L records sourced from executions and positions — no invented data"
      />
      <PerformanceListClient />
    </div>
  );
}
