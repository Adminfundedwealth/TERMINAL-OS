import { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardSummaryCards } from "@/components/dashboard/summary-cards";
import { RecentAccountsTable } from "@/components/dashboard/recent-accounts";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders";
import { RecentRiskEvents } from "@/components/dashboard/recent-risk-events";
import { SystemHealthPanel } from "@/components/dashboard/system-health-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDashboardSummary,
  getRecentAccounts,
  getRecentOrders,
  getRecentRiskEvents,
} from "@/server/services/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Revalidate every 60 seconds
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, recentAccounts, recentOrders, recentRiskEvents] =
    await Promise.all([
      getDashboardSummary(),
      getRecentAccounts(5),
      getRecentOrders(10),
      getRecentRiskEvents(5),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="FundedWealth Terminal OS — operational overview"
      />

      {/* Summary stat cards */}
      <Suspense fallback={<SummaryCardsSkeleton />}>
        <DashboardSummaryCards summary={summary} />
      </Suspense>

      {/* Three-column activity grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Account activity */}
        <div className="xl:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Accounts
          </h2>
          <RecentAccountsTable accounts={recentAccounts} />
        </div>

        {/* Order activity */}
        <div className="xl:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Orders
          </h2>
          <RecentOrdersTable orders={recentOrders} />
        </div>

        {/* Risk events */}
        <div className="xl:col-span-1 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Risk Events
          </h2>
          <RecentRiskEvents events={recentRiskEvents} />
        </div>
      </div>

      {/* System health */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">
          System Health
        </h2>
        <SystemHealthPanel health={summary.system_health} />
      </div>
    </div>
  );
}

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-28 col-span-2" />
      ))}
    </div>
  );
}
