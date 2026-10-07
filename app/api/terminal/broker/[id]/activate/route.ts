/**
 * POST /api/terminal/broker/[id]/activate
 * Activates a tested FundedWealth broker connection for gateway use.
 */
import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getBrokerCredentialById, setActiveBroker } from "@/server/services/broker-credentials";
import { writeActivityLog } from "@/lib/logger";

function getId(req: Request): string {
  const parts = new URL(req.url).pathname.split("/");
  return parts[parts.length - 2] ?? "";
}

export const POST = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const id = getId(req);
    const record = await getBrokerCredentialById(id);

    if (!record) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Credential not found." } },
        { status: 404 }
      );
    }

    await setActiveBroker(id, employee.id);

    await writeActivityLog({
      employee_id: employee.id,
      action: "BROKER_SET_ACTIVE",
      module: "broker",
      resource: "broker_credentials",
      resource_id: id,
      result: "SUCCESS",
      metadata: { broker_id: record.broker_id, label: record.label },
    });

    return NextResponse.json({
      data: { activated: true, broker_id: record.broker_id, label: record.label },
    });
  } catch (err) {
    return handleApiError(err);
  }
});
