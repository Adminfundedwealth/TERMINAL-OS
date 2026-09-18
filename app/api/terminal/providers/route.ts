import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { getProvidersWithHealth } from "@/server/services/providers";

export const GET = withAuth(PERMISSIONS.PROVIDERS_VIEW, async () => {
  const providers = await getProvidersWithHealth();

  // Strip any fields that might contain credentials — return only operational info
  const safe = providers.map(({ id, provider_name, provider_type, environment, is_active, health }) => ({
    id,
    provider_name,
    provider_type,
    environment,
    is_active,
    // Operational status only — no secrets
    status: health?.status ?? "UNKNOWN",
    last_heartbeat_at: health?.last_heartbeat_at ?? null,
    last_success_at: health?.last_success_at ?? null,
    last_error_at: health?.last_error_at ?? null,
    // Safe error message — not raw stack traces
    last_error_message: health?.last_error_message
      ? health.last_error_message.slice(0, 200)
      : null,
    checked_at: health?.checked_at ?? null,
  }));

  return NextResponse.json({ data: safe });
});
