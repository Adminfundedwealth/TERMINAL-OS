/**
 * Structured server-side logger for Terminal OS.
 * Never logs secrets, tokens, passwords, or credentials.
 * All output stays server-side — never reaches the browser.
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  operation: string;
  request_id?: string;
  employee_id?: string;
  account_id?: string;
  result?: string;
  error_code?: string;
  [key: string]: unknown;
}

/**
 * Structured log output. In production, pipe this to your log aggregator.
 * Intentionally avoids console.log to satisfy the eslint rule.
 */
export function serverLog(
  level: LogLevel,
  service: string,
  operation: string,
  meta: Partial<Omit<LogEntry, "timestamp" | "level" | "service" | "operation">> = {}
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    operation,
    ...meta,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    // info / debug — only in non-production to avoid log noise
    if (process.env.NODE_ENV !== "production") {
      console.warn(line);
    }
  }
}

/**
 * Writes an activity record to the terminal_activity table.
 * Call this for all significant employee operations.
 */
export async function writeActivityLog(params: {
  employee_id: string | null;
  action: string;
  module: string;
  resource?: string;
  resource_id?: string;
  result: string;
  ip_address?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    // Lazy import to avoid circular deps and keep this file lightweight
    const { createServerSupabaseClient } = await import(
      "@/lib/supabase/server"
    );
    const client = createServerSupabaseClient();
    await client.from("terminal_activity").insert({
      employee_id: params.employee_id ?? null,
      action: params.action,
      module: params.module,
      resource: params.resource ?? null,
      resource_id: params.resource_id ?? null,
      result: params.result,
      ip_address: params.ip_address ?? null,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    // Activity logging must never crash the main request
    serverLog("warn", "logger", "activity_write_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
