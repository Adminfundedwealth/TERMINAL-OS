import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getWatchlists } from "@/server/services/user-data";

export const GET = withAuth(PERMISSIONS.WATCHLISTS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);
  const { data, total } = await getWatchlists({
    owner_user_id: searchParams.get("user_id") ?? undefined,
    page, page_size: pageSize,
  });
  return NextResponse.json({ data, meta: { total, page, page_size: pageSize } });
});
