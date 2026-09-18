import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getDailyPerformance, getPerformanceSummary } from "@/server/services/performance";

export const GET = withAuth(PERMISSIONS.PERFORMANCE_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("account_id");

  if (accountId && searchParams.get("view") === "summary") {
    const summary = await getPerformanceSummary(accountId);
    return NextResponse.json({ data: summary });
  }

  const { page, pageSize } = parsePagination(searchParams);
  const { data, total } = await getDailyPerformance({
    trading_account_id: accountId ?? undefined,
    date_from: searchParams.get("date_from") ?? undefined,
    date_to: searchParams.get("date_to") ?? undefined,
    page,
    page_size: pageSize,
  });

  return NextResponse.json({
    data,
    meta: { total, page, page_size: pageSize, has_more: page * pageSize < total },
  });
});
