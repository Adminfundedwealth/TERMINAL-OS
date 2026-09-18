import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getOrderById, getOrderExecutions } from "@/server/services/orders";

export const GET = withAuth(PERMISSIONS.ORDERS_VIEW, async ({ req }) => {
  try {
    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "ID required." } }, { status: 400 });

    const [order, executions] = await Promise.all([
      getOrderById(id),
      getOrderExecutions(id),
    ]);

    if (!order) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Order not found." } }, { status: 404 });

    return NextResponse.json({ data: { order, executions } });
  } catch (err) {
    return handleApiError(err);
  }
});
