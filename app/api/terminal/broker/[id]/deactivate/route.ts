/**
 * POST /api/terminal/broker/[id]/deactivate
 * Deactivates a FundedWealth broker connection without deleting it.
 */
import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  deactivateCentralBrokerConnection,
  getCentralBrokerConnectionById,
} from "@/server/services/broker-connections";
import { writeActivityLog } from "@/lib/logger";

function getId(req: Request): string {
  const parts = new URL(req.url).pathname.split("/");
  return parts[parts.length - 2] ?? "";
}

export const POST = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const id = getId(req);
    const record = await getCentralBrokerConnectionById(id);
    if (!record) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Broker connection not found." } },
        { status: 404 }
      );
    }

    await deactivateCentralBrokerConnection(id, employee.id);
    await writeActivityLog({
      employee_id: employee.id,
      action: "BROKER_CONNECTION_DEACTIVATED",
      module: "broker",
      resource: "broker_connections",
      resource_id: id,
      result: "SUCCESS",
      metadata: { broker_id: record.broker_id, label: record.label },
    });

    return NextResponse.json({ data: { deactivated: true, broker_id: record.broker_id } });
  } catch (error) {
    return handleApiError(error);
  }
});