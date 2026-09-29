import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getMarketDataHealth } from "@/server/services/market-data-health";

export const GET = withAuth(PERMISSIONS.BROKER_VIEW, async ({ req }) => {
  const accountId = new URL(req.url).searchParams.get("account_id");
  const health = await getMarketDataHealth(accountId);
  return NextResponse.json(health, { headers: { "Cache-Control": "no-store" } });
});