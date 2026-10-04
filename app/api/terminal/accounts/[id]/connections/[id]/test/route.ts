import { NextResponse } from "next/server";
import { handleApiError, withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { writeActivityLog } from "@/lib/logger";
import { testCentralBrokerConnection, getCentralBrokerConnection } from "@/server/services/broker-connections";

export const POST = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const id = new URL(req.url).pathname.split("/").filter(Boolean).at(-2) ?? "";
    
    // Get broker_id and environment from the connection record
    const connection = await getCentralBrokerConnection(id);
    if (!connection) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Central broker connection not found." } },
        { status: 404 }
      );
    }

    const scope = {
      broker_id: connection.broker_id,
      environment: connection.environment as "production" | "paper" | "sandbox",
    };
    const result = await testCentralBrokerConnection(id, scope, employee.id);
    
    await writeActivityLog({
      employee_id: employee.id,
      action: "CENTRAL_BROKER_CONNECTION_TESTED",
      module: "broker",
      resource: "broker_connections",
      resource_id: id,
      result: result.success ? "SUCCESS" : "FAILURE",
      metadata: {
        broker_id: scope.broker_id,
        environment: scope.environment,
        test_result: result.message,
        implemented: result.implemented,
      },
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
});