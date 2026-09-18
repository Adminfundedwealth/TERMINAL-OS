import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getExecutionById } from "@/server/services/executions";

export const GET = withAuth(PERMISSIONS.EXECUTIONS_VIEW, async ({ req }) => {
  try {
    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "ID required." } }, { status: 400 });

    const execution = await getExecutionById(id);
    if (!execution) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Execution not found." } }, { status: 404 });

    return NextResponse.json({ data: execution });
  } catch (err) {
    return handleApiError(err);
  }
});
