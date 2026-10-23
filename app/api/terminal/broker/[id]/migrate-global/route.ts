import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { writeActivityLog } from "@/lib/logger";
import { reencryptUnboundFounderDhanCredential } from "@/server/services/broker-connections";

const RequestSchema = z.object({ source_id: z.string().uuid() }).strict();

function getTargetId(req: Request): string {
  const parts = new URL(req.url).pathname.split("/");
  return parts[parts.length - 2] ?? "";
}

export const POST = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request data." } },
        { status: 400 },
      );
    }

    const targetId = getTargetId(req);
    const migrated = await reencryptUnboundFounderDhanCredential(
      targetId,
      parsed.data.source_id,
      employee.id,
    );
    await writeActivityLog({
      employee_id: employee.id,
      action: "BROKER_GLOBAL_DHAN_CREDENTIAL_REENCRYPTED",
      module: "broker",
      resource: "broker_connections",
      resource_id: targetId,
      result: "SUCCESS",
      metadata: { broker_id: "dhan", environment: "production", source_id: migrated.source_id },
    });

    return NextResponse.json({ data: { migrated: true, broker_id: "dhan", environment: "production" } });
  } catch (error) {
    return handleApiError(error);
  }
});
