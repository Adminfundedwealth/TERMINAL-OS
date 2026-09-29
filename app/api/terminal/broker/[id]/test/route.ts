/**
 * POST /api/terminal/broker/[id]/test
 * Tests the connection for a saved broker credential.
 * Dhan and Kite authenticate through their read-only provider adapters.
 */
import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  testBrokerConnection,
  getBrokerCredentialTestTarget,
} from "@/server/services/broker-credentials";
import { writeActivityLog } from "@/lib/logger";
import { z } from "zod";

const TestSchema = z.object({
  trading_account_id: z.string().uuid(),
  broker_id: z.enum(["dhan", "zerodha"]),
  environment: z.enum(["production", "paper", "sandbox"]).default("production"),
});

function getId(req: Request): string {
  // URL: /api/terminal/broker/[id]/test — id is 2nd-to-last segment
  const parts = new URL(req.url).pathname.split("/");
  return parts[parts.length - 2] ?? "";
}

export const POST = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const id = getId(req);
    const parsed = TestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Select an account, broker, and environment for the connection test." } },
        { status: 400 }
      );
    }
    const scopedCredentialId = await getBrokerCredentialTestTarget(id, parsed.data);
    if (!scopedCredentialId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Credential not found." } },
        { status: 404 }
      );
    }

    const result = await testBrokerConnection(scopedCredentialId, parsed.data);

    // Audit log — no credential values
    await writeActivityLog({
      employee_id: employee.id,
      action: "BROKER_CONNECTION_TEST",
      module: "broker",
      resource: "broker_credentials",
      resource_id: scopedCredentialId,
      result: result.success ? "SUCCESS" : "FAILED",
      metadata: {
        broker_id: parsed.data.broker_id,
        test_result: result.message,
        implemented: result.implemented,
      },
    });

    return NextResponse.json({
      data: {
        success: result.success,
        broker_id: parsed.data.broker_id,
        message: result.message,
        tested_at: new Date().toISOString(),
        implemented: result.implemented,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
});
