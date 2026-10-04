import { NextResponse } from "next/server";
import { handleApiError, withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { writeActivityLog } from "@/lib/logger";
import { activateCentralBrokerConnection } from "@/server/services/broker-connections";

export const POST = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const id = new URL(req.url).pathname.split("/").filter(Boolean).at(-2) ?? "";
    const data = await activateCentralBrokerConnection(id, employee.id);
    await writeActivityLog({ employee_id: employee.id, action: "CENTRAL_BROKER_CONNECTION_ACTIVATED", module: "broker", resource: "broker_connections", resource_id: id, result: "SUCCESS", metadata: { broker_id: data.broker_id, environment: data.environment } });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
});