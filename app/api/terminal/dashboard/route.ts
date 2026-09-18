import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  getDashboardSummary,
  getRecentAccounts,
  getRecentOrders,
  getRecentRiskEvents,
} from "@/server/services/dashboard";

export const GET = withAuth(PERMISSIONS.DASHBOARD_VIEW, async () => {
  const [summary, recentAccounts, recentOrders, recentRiskEvents] =
    await Promise.all([
      getDashboardSummary(),
      getRecentAccounts(5),
      getRecentOrders(10),
      getRecentRiskEvents(5),
    ]);

  return NextResponse.json({
    data: {
      summary,
      recent_accounts: recentAccounts,
      recent_orders: recentOrders,
      recent_risk_events: recentRiskEvents,
    },
  });
});
