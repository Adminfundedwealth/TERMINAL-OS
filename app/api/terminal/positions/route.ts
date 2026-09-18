import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getPositions } from "@/server/services/positions";

export const GET = withAuth(PERMISSIONS.POSITIONS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);

  const { data, total } = await getPositions({
    trading_account_id: searchParams.get("account_id") ?? undefined,
    symbol: searchParams.get("symbol") ?? undefined,
    side: searchParams.get("side") ?? undefined,
    status: (searchParams.get("status")?.toLowerCase() as "open" | "closed") ?? "open",
    page,
    page_size: pageSize,
  });

  return NextResponse.json({
    data,
    meta: { total, page, page_size: pageSize, has_more: page * pageSize < total },
  });
});
