/**
 * GET    /api/terminal/broker/[id]  — central connection (masked)
 * PUT    /api/terminal/broker/[id]  — update central connection
 * ADMIN / SUPER_ADMIN only.
 */
import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  getCentralBrokerConnectionById,
  updateCentralBrokerConnection,
} from "@/server/services/broker-connections";
import { writeActivityLog, serverLog } from "@/lib/logger";
import { z } from "zod";

const UpdateSchema = z.object({
  label: z.string().max(64).optional(),
  credentials: z.record(z.string(), z.string()).optional(),
  environment: z.enum(["production", "paper", "sandbox"]).optional(),
});

function getId(req: Request): string {
  const parts = new URL(req.url).pathname.split("/");
  return parts[parts.length - 1] ?? "";
}

export const GET = withAuth(PERMISSIONS.BROKER_VIEW, async ({ req }) => {
  try {
    const id = getId(req);
    const record = await getCentralBrokerConnectionById(id);
    if (!record) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Credential not found." } }, { status: 404 });
    }
    return NextResponse.json({ data: record });
  } catch (err) {
    return handleApiError(err);
  }
});
export const PUT = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const id = getId(req);
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request data." } },
        { status: 400 }
      );
    }

    const record = await updateCentralBrokerConnection(id, parsed.data, employee.id);
    if (!record) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Credential not found." } }, { status: 404 });
    }

    await writeActivityLog({
      employee_id: employee.id,
      action: "BROKER_CONNECTION_UPDATED",
      module: "broker",
      resource: "broker_connections",
      resource_id: id,
      result: "SUCCESS",
      // NEVER log credential values
      metadata: { updated_fields: Object.keys(parsed.data).filter((k) => k !== "credentials"), broker_id: record.broker_id },
    });

    return NextResponse.json({ data: record });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    serverLog("error", "broker", "update_failed", { employeeId: employee.id, message: msg });
    return NextResponse.json({ error: { code: "UPDATE_FAILED", message: msg } }, { status: 500 });
  }
});

