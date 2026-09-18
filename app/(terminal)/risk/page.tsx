import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { RiskMetricsTable } from "@/components/risk/risk-metrics-table";
import { RecentRiskEvents } from "@/components/dashboard/recent-risk-events";
import { getRiskDashboardSummary } from "@/server/services/risk";

export const metadata: Metadata = { title: "Risk Management" };
export const revalidate = 30;

export default async function RiskPage() {
  const summary = await getRiskDashboardSummary();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Management"
        description="Account risk status across all trading accounts"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Accounts at Risk" value={String(summary.accounts_at_risk)} description="Non-normal risk status" />
        <StatCard title="Breached" value={String(summary.breached)} description="Limit breached" />
        <StatCard title="Critical" value={String(summary.critical)} description="Near limit" />
        <StatCard title="Warning" value={String(summary.warning)} description="Approaching limit" />
      </div>

      {/* Account metrics + recent events */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <h2 className="text-sm font-semibold mb-3">Account Risk Status</h2>
          <RiskMetricsTable />
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-3">Recent Risk Events</h2>
          <RecentRiskEvents events={summary.recent_events} />
        </div>
      </div>
    </div>
  );
}
