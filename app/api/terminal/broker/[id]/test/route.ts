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
  getBrokerCredentialById,
} from "@/server/services/broker-credentials";
import {
  getCentralBrokerConnectionById,
  testCentralBrokerConnection,
} from "@/server/services/broker-connections";
import { writeActivityLog } from "@/lib/logger";

function getId(req: Request): string {
  // URL: /api/terminal/broker/[id]/test — id is 2nd-to-last segment
  const parts = new URL(req.url).pathname.split("/");
  return parts[parts.length - 2] ?? "";
}

export const POST = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const id = getId(req);
    const centralRecord = await getCentralBrokerConnectionById(id);
    if (centralRecord) {
      const result = await testCentralBrokerConnection(id, {
        broker_id: centralRecord.broker_id,
        environment: centralRecord.environment as "production" | "paper" | "sandbox",
      }, employee.id);
      await writeActivityLog({
        employee_id: employee.id,
        action: "BROKER_CONNECTION_TEST",
        module: "broker",
        resource: "broker_connections",
        resource_id: id,
        result: result.success ? "SUCCESS" : "FAILED",
        metadata: {
          broker_id: centralRecord.broker_id,
          environment: centralRecord.environment,
          test_result: result.message,
          implemented: result.implemented,
        },
      });
      return NextResponse.json({
        data: {
          success: result.success,
          broker_id: centralRecord.broker_id,
          message: result.message,
          tested_at: new Date().toISOString(),
          implemented: result.implemented,
        },
      });
    }

    const record = await getBrokerCredentialById(id);

    if (!record) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Credential not found." } },
        { status: 404 }
      );
    }

    const result = await testBrokerConnection(id);

    // Audit log — no credential values
    await writeActivityLog({
      employee_id: employee.id,
      action: "BROKER_CONNECTION_TEST",
      module: "broker",
      resource: "broker_credentials",
      resource_id: id,
      result: result.success ? "SUCCESS" : "FAILED",
      metadata: {
        broker_id: record.broker_id,
        test_result: result.message,
        implemented: result.implemented,
      },
    });

    return NextResponse.json({
      data: {
        success: result.success,
        broker_id: record.broker_id,
        message: result.message,
        tested_at: new Date().toISOString(),
        implemented: result.implemented,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
});
