import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getRiskEvents } from "@/server/services/risk";

export const GET = withAuth(PERMISSIONS.RISK_EVENTS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);

  const { data, total } = await getRiskEvents({
    trading_account_id: searchParams.get("account_id") ?? undefined,
    event_type: searchParams.get("event_type") ?? undefined,
    severity: searchParams.get("severity") ?? undefined,
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
