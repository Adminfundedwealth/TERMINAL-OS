import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getOrders } from "@/server/services/orders";

export const GET = withAuth(PERMISSIONS.ORDERS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);

  const { data, total } = await getOrders({
    trading_account_id: searchParams.get("account_id") ?? undefined,
    symbol: searchParams.get("symbol") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    side: searchParams.get("side") ?? undefined,
    order_type: searchParams.get("order_type") ?? undefined,
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
