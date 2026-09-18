import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getRiskDashboardSummary, getLatestAccountMetrics } from "@/server/services/risk";

export const GET = withAuth(PERMISSIONS.RISK_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");

  if (view === "metrics") {
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(searchParams.get("page_size") ?? "25", 10);
    const { data, total } = await getLatestAccountMetrics({
      risk_status: searchParams.get("risk_status") ?? undefined,
      page,
      page_size: pageSize,
    });
    return NextResponse.json({ data, meta: { total, page, page_size: pageSize } });
  }

  const summary = await getRiskDashboardSummary();
  return NextResponse.json({ data: summary });
});
