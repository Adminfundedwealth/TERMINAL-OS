import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getSettings } from "@/server/services/operations";

export const GET = withAuth(PERMISSIONS.SETTINGS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const data = await getSettings(category);
  return NextResponse.json({ data });
});

export const PATCH = withAuth(PERMISSIONS.SETTINGS_MANAGE, async () =>
  NextResponse.json(
    { error: { code: "UNAVAILABLE", message: "Terminal settings are unavailable because terminal_settings is not part of the live database." } },
    { status: 501 }
  )
);
