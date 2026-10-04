import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { writeActivityLog } from "@/lib/logger";
import { BROKER_PROVIDERS } from "@/lib/brokers/provider-definitions";
import { createCentralBrokerConnectionFromPayload, listCentralBrokerConnections } from "@/server/services/broker-connections";
import type { BrokerId } from "@/types/broker";

const brokerIds = BROKER_PROVIDERS.map((provider) => provider.id) as [BrokerId, ...BrokerId[]];
const CreateSchema = z.object({
  broker_id: z.enum(brokerIds),
  environment: z.enum(["production", "paper", "sandbox"]).default("production"),
  label: z.string().trim().min(1).max(64),
  credentials: z.record(z.string(), z.string()),
});

export const GET = withAuth(PERMISSIONS.BROKER_VIEW, async () => {
  try {
    return NextResponse.json({ data: await listCentralBrokerConnections() });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAuth(PERMISSIONS.BROKER_MANAGE, async ({ req, employee }) => {
  try {
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid connection data." } }, { status: 400 });
    }
    const data = await createCentralBrokerConnectionFromPayload(parsed.data, employee.id);
    await writeActivityLog({
      employee_id: employee.id,
      action: "CENTRAL_BROKER_CONNECTION_CREATED",
      module: "broker",
      resource: "broker_connections",
      resource_id: data.id,
      result: "SUCCESS",
      metadata: { broker_id: data.broker_id, environment: data.environment, label: data.label },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});