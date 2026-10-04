import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { writeActivityLog } from "@/lib/logger";
import { getCentralBrokerConnection, updateCentralBrokerConnection } from "@/server/services/broker-connections";

const UpdateSchema = z.object({
  label: z.string().trim().min(1).max(64).optional(),
  environment: z.enum(["production", "paper", "sandbox"]).optional(),
  credentials: z.record(z.string(), z.string()).optional(),
}).strict();

function getId(req: Request): string {
  return new URL(req.url).pathname.split("/").filter(Boolean).at(-1) ?? "";
}

export const GET = withAuth(PERMISSIONS.BROKER_VIEW, async ({ req }) => {
  try {
    const data = await getCentralBrokerConnection(getId(req));
    if (!data) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Central connection not found." } }, { status: 404 });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const id = getId(req);
    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid connection update." } }, { status: 400 });
    const data = await updateCentralBrokerConnection(id, parsed.data, employee.id);
    if (!data) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Central connection not found." } }, { status: 404 });
    await writeActivityLog({
      employee_id: employee.id,
      action: "CENTRAL_BROKER_CONNECTION_UPDATED",
      module: "broker",
      resource: "broker_connections",
      resource_id: id,
      result: "SUCCESS",
      metadata: { updated_fields: Object.keys(parsed.data).filter((field) => field !== "credentials") },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
});