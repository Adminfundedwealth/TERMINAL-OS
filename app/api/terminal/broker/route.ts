/**
 * GET  /api/terminal/broker  — list all saved broker credentials (masked)
 * POST /api/terminal/broker  — save new broker credentials
 *
 * ADMIN / SUPER_ADMIN only.
 * Raw credentials are NEVER returned. All secrets are masked.
 */
import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import {
  getAllBrokerCredentials,
  createBrokerCredential,
} from "@/server/services/broker-credentials";
import { writeActivityLog, serverLog } from "@/lib/logger";
import { BROKER_PROVIDERS } from "@/lib/brokers/provider-definitions";
import { z } from "zod";
import type { BrokerId } from "@/types/broker";

const VALID_BROKER_IDS = BROKER_PROVIDERS.map((p) => p.id) as [BrokerId, ...BrokerId[]];

const SaveSchema = z.object({
  broker_id: z.enum(VALID_BROKER_IDS),
  label: z.string().max(64).optional(),
  credentials: z.record(z.string(), z.string()),
  environment: z.enum(["production", "paper", "sandbox"]).optional(),
});

export const GET = withAuth(PERMISSIONS.BROKER_VIEW, async ({ employee }) => {
  try {
    const rows = await getAllBrokerCredentials();
    // Attach provider metadata (name, capabilities etc.) client needs for display
    const enriched = rows.map((row) => {
      const provider = BROKER_PROVIDERS.find((p) => p.id === row.broker_id);
      return {
        ...row,
        provider_name: provider?.name ?? row.broker_id,
        capabilities: provider?.capabilities ?? [],
        runtime_integrated: provider?.runtimeIntegrated ?? false,
      };
    });
    return NextResponse.json({ data: enriched });
  } catch (err) {
    serverLog("error", "broker", "list_failed", { employeeId: employee.id, message: String(err) });
    return handleApiError(err);
  }
});

export const POST = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const body = await req.json();
    const parsed = SaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid request data.", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const record = await createBrokerCredential(parsed.data, employee.id);

    // Audit log — NEVER include credential values
    await writeActivityLog({
      employee_id: employee.id,
      action: "BROKER_CREDENTIALS_CREATED",
      module: "broker",
      resource: "broker_credentials",
      resource_id: record.id,
      result: "SUCCESS",
      metadata: { broker_id: parsed.data.broker_id, label: parsed.data.label },
    });

    return NextResponse.json({ data: record }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    serverLog("error", "broker", "create_failed", { employeeId: employee.id, message: msg });
    return NextResponse.json(
      { error: { code: "CREATE_FAILED", message: msg } },
      { status: 500 }
    );
  }
});
