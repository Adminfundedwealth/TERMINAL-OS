import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { bindAccountToCentralBrokerConnection } from "@/server/services/broker-connections";
import { writeActivityLog } from "@/lib/logger";

function ids(req: Request): { connectionId: string; accountId: string } {
  const parts = new URL(req.url).pathname.split("/");
  return {
    connectionId: parts[parts.length - 3] ?? "",
    accountId: parts[parts.length - 1] ?? "",
  };
}

export const POST = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const { connectionId, accountId } = ids(req);
    await bindAccountToCentralBrokerConnection(accountId, connectionId, employee.id);
    await writeActivityLog({
      employee_id: employee.id,
      action: "BROKER_CONNECTION_BOUND",
      module: "broker",
      resource: "trading_account_broker_connections",
      resource_id: accountId,
      result: "SUCCESS",
      metadata: { broker_connection_id: connectionId },
    });
    return NextResponse.json({ data: { bound: true, trading_account_id: accountId, broker_connection_id: connectionId } });
  } catch (error) {
    return handleApiError(error);
  }
});
