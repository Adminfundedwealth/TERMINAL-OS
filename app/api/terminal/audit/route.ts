import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getAuditLogs } from "@/server/services/operations";

export const GET = withAuth(PERMISSIONS.AUDIT_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);
  const { data, total } = await getAuditLogs({
    employee_id: searchParams.get("employee_id") ?? undefined,
    date_from: searchParams.get("date_from") ?? undefined,
    date_to: searchParams.get("date_to") ?? undefined,
    page,
    page_size: pageSize,
  });
  return NextResponse.json({ data, meta: { total, page, page_size: pageSize, has_more: page * pageSize < total } });
});
