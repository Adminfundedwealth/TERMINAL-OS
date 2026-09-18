import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getJournalEntries } from "@/server/services/user-data";

export const GET = withAuth(PERMISSIONS.JOURNAL_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);
  const { data, total } = await getJournalEntries({
    trading_account_id: searchParams.get("account_id") ?? undefined,
    date_from: searchParams.get("date_from") ?? undefined,
    date_to: searchParams.get("date_to") ?? undefined,
    page, page_size: pageSize,
  });
  return NextResponse.json({ data, meta: { total, page, page_size: pageSize } });
});
