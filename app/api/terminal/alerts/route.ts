import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getAlerts } from "@/server/services/user-data";

export const GET = withAuth(PERMISSIONS.ALERTS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);
  const { data, total } = await getAlerts({
    trading_account_id: searchParams.get("account_id") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page, page_size: pageSize,
  });
  return NextResponse.json({ data, meta: { total, page, page_size: pageSize } });
});
