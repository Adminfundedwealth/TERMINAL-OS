import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getRiskDashboardSummary, getLatestAccountMetrics } from "@/server/services/risk";

export const GET = withAuth(PERMISSIONS.RISK_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");

  if (view === "metrics") {
    const { page, pageSize } = parsePagination(searchParams);
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
