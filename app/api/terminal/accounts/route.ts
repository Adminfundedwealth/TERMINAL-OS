import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getAccounts } from "@/server/services/accounts";

export const GET = withAuth(PERMISSIONS.ACCOUNTS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);

  const { data, total } = await getAccounts({
    status: searchParams.get("status") ?? undefined,
    trader_id: searchParams.get("trader_id") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    sort_by: searchParams.get("sort_by") ?? undefined,
    sort_order: (searchParams.get("sort_order") as "asc" | "desc") ?? undefined,
    page,
    page_size: pageSize,
  });

  return NextResponse.json({
    data,
    meta: { total, page, page_size: pageSize, has_more: page * pageSize < total },
  });
});
