import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getExecutions } from "@/server/services/executions";

export const GET = withAuth(PERMISSIONS.EXECUTIONS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);

  const { data, total } = await getExecutions({
    trading_account_id: searchParams.get("account_id") ?? undefined,
    symbol: searchParams.get("symbol") ?? undefined,
    side: searchParams.get("side") ?? undefined,
    segment: searchParams.get("segment") ?? undefined,
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
