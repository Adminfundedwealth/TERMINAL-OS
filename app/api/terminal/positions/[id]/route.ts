import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getPositionById } from "@/server/services/positions";

export const GET = withAuth(PERMISSIONS.POSITIONS_VIEW, async ({ req }) => {
  try {
    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "ID required." } }, { status: 400 });

    const position = await getPositionById(id);
    if (!position) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Position not found." } }, { status: 404 });

    return NextResponse.json({ data: position });
  } catch (err) {
    return handleApiError(err);
  }
});
