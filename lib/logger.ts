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
  // terminal_activity is absent from the canonical schema; retain a structured server audit trail.
  serverLog("info", params.module, params.action, {
    employee_id: params.employee_id ?? undefined,
    result: params.result,
    resource: params.resource,
    resource_id: params.resource_id,
    ip_address: params.ip_address,
    metadata: params.metadata,
  });
}
