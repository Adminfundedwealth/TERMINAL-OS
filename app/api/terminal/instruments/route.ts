import { NextResponse } from "next/server";
import { withAuth, parsePagination } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getInstruments, getInstrumentStats } from "@/server/services/instruments";

export const GET = withAuth(PERMISSIONS.INSTRUMENTS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("view") === "stats") {
    const stats = await getInstrumentStats();
    return NextResponse.json({ data: stats });
  }

  const { page, pageSize } = parsePagination(searchParams);
  const { data, total } = await getInstruments({
    exchange: searchParams.get("exchange") ?? undefined,
    segment: searchParams.get("segment") ?? undefined,
    instrument_type: searchParams.get("instrument_type") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page,
    page_size: pageSize,
  });

  return NextResponse.json({
    data,
    meta: { total, page, page_size: pageSize, has_more: page * pageSize < total },
  });
});
