/**
 * GET /api/terminal/broker/providers
 * Returns the static provider definitions (no credentials, no secrets).
 * Safe to call from the frontend — contains only metadata.
 */
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { BROKER_PROVIDERS } from "@/lib/brokers/provider-definitions";

export const GET = withAuth(PERMISSIONS.BROKER_VIEW, async () => {
  // Return provider metadata only — no credentials, no secrets
  const providers = BROKER_PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    textColor: p.textColor,
    capabilities: p.capabilities,
    fields: p.fields,
    docsUrl: p.docsUrl,
    runtimeIntegrated: p.runtimeIntegrated,
    // Never return apiBase/wsBase — those are server-side only config
  }));

  return NextResponse.json({ data: providers });
});
