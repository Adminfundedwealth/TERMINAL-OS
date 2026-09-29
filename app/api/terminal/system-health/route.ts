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
      .from("trading_accounts")
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

  // Provider health is unavailable because provider_health is not a live table.
  checks.push({
    name: "market_data_providers",
    status: "UNKNOWN",
    response_time_ms: null,
    last_success_at: null,
    last_error: "Provider health storage is unavailable",
    checked_at: now,
  });

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
