import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getActivityLogs } from "@/server/services/operations";

export const GET = withAuth(PERMISSIONS.ACTIVITY_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);
  const { data, total } = await getActivityLogs({
    employee_id: searchParams.get("employee_id") ?? undefined,
    module: searchParams.get("module") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    date_from: searchParams.get("date_from") ?? undefined,
    date_to: searchParams.get("date_to") ?? undefined,
    page,
    page_size: pageSize,
  });
  return NextResponse.json({ data, meta: { total, page, page_size: pageSize, has_more: page * pageSize < total } });
});
