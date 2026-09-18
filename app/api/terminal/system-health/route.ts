import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/api-handler";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ServiceHealthStatus } from "@/types";

interface ServiceCheck {
  name: string;
  status: ServiceHealthStatus;
  response_time_ms: number | null;
  last_success_at: string | null;
  last_error: string | null;
  checked_at: string;
}

export const GET = withAuth(PERMISSIONS.SYSTEM_HEALTH_VIEW, async () => {
  const checks: ServiceCheck[] = [];
  const now = new Date().toISOString();

  // Database health
  const dbStart = Date.now();
  try {
    const db = createServerSupabaseClient();
    const { error } = await db
      .from("terminal_settings")
      .select("id", { count: "exact", head: true });
    checks.push({
      name: "database",
      status: error ? "CRITICAL" : "HEALTHY",
      response_time_ms: Date.now() - dbStart,
      last_success_at: error ? null : now,
      last_error: error ? "Database query failed" : null,
      checked_at: now,
    });
  } catch {
    checks.push({
      name: "database",
      status: "CRITICAL",
      response_time_ms: Date.now() - dbStart,
      last_success_at: null,
      last_error: "Cannot reach database",
      checked_at: now,
    });
  }

  // Provider health from DB
  try {
    const db = createServerSupabaseClient();
    const { data: healthData } = await db
      .from("provider_health")
      .select("provider_id, status, last_success_at, last_error_message, checked_at")
      .order("checked_at", { ascending: false })
      .limit(20);

    const providers = (healthData ?? []) as Array<{
      provider_id: string;
      status: string;
      last_success_at: string | null;
      last_error_message: string | null;
      checked_at: string;
    }>;
    // Aggregate provider health
    const hasError = providers.some((p) => p.status === "ERROR");
    const allUnknown = providers.length === 0 || providers.every((p) => p.status === "UNKNOWN");
    const anyConnected = providers.some((p) => p.status === "CONNECTED");

    checks.push({
      name: "market_data_providers",
      status: allUnknown ? "UNKNOWN" : hasError ? "WARNING" : anyConnected ? "HEALTHY" : "UNKNOWN",
      response_time_ms: null,
      last_success_at: providers.find((p) => p.last_success_at)?.last_success_at ?? null,
      last_error: null,
      checked_at: now,
    });
  } catch {
    checks.push({ name: "market_data_providers", status: "UNKNOWN", response_time_ms: null, last_success_at: null, last_error: null, checked_at: now });
  }

  // Terminal API (self-check)
  checks.push({
    name: "terminal_api",
    status: "HEALTHY",
    response_time_ms: null,
    last_success_at: now,
    last_error: null,
    checked_at: now,
  });

  // Services not yet implemented — honest unknown state
  const unknownServices = [
    "websocket_service",
    "order_service",
    "execution_service",
    "position_service",
    "risk_service",
    "performance_service",
    "instrument_sync",
  ];

  for (const svc of unknownServices) {
    checks.push({
      name: svc,
      status: "UNKNOWN",
      response_time_ms: null,
      last_success_at: null,
      last_error: null,
      checked_at: now,
    });
  }

  return NextResponse.json({ data: checks, checked_at: now });
});
