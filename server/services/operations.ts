/**
 * Operations service — activity log, audit log, employees, settings.
 * All data from Terminal Supabase #2 only.
 */
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActivityLog, Employee, TerminalSetting } from "@/types";

// -------------------------------------------------------
// ACTIVITY LOG
// -------------------------------------------------------

export interface ActivityFilters {
  employee_id?: string;
  module?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export async function getActivityLogs(
  filters: ActivityFilters = {}
): Promise<{ data: ActivityLog[]; total: number }> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 50);
  const offset = (page - 1) * pageSize;

  let query = db.from("terminal_activity").select("*", { count: "exact" });
  if (filters.employee_id) query = query.eq("employee_id", filters.employee_id);
  if (filters.module) query = query.eq("module", filters.module);
  if (filters.action) query = query.ilike("action", `%${filters.action}%`);
  if (filters.date_from) query = query.gte("timestamp", filters.date_from);
  if (filters.date_to) query = query.lte("timestamp", filters.date_to);

  const { data, count, error } = await query
    .order("timestamp", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as ActivityLog[], total: count ?? 0 };
}

// Audit log is a filtered view of activity — security-sensitive operations
export async function getAuditLogs(
  filters: ActivityFilters = {}
): Promise<{ data: ActivityLog[]; total: number }> {
  const AUDIT_ACTIONS = [
    "LOGIN", "LOGOUT", "LOGIN_FAILED",
    "PERMISSION_CHANGE", "ACCOUNT_ACCESS", "ACCOUNT_STATUS_CHANGE",
    "ORDER_INTERVENTION", "RISK_INTERVENTION",
    "PROVIDER_CONFIG_CHANGE", "SYSTEM_CONFIG_CHANGE",
    "EMPLOYEE_CREATED", "EMPLOYEE_UPDATED", "EMPLOYEE_DISABLED",
  ];

  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 50);
  const offset = (page - 1) * pageSize;

  let query = db
    .from("terminal_activity")
    .select("*", { count: "exact" })
    .in("action", AUDIT_ACTIONS);

  if (filters.employee_id) query = query.eq("employee_id", filters.employee_id);
  if (filters.date_from) query = query.gte("timestamp", filters.date_from);
  if (filters.date_to) query = query.lte("timestamp", filters.date_to);

  const { data, count, error } = await query
    .order("timestamp", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as ActivityLog[], total: count ?? 0 };
}

// -------------------------------------------------------
// EMPLOYEES
// -------------------------------------------------------

export async function getEmployees(
  filters: { status?: string; role?: string; page?: number; page_size?: number } = {}
): Promise<{ data: Employee[]; total: number }> {
  const db = createServerSupabaseClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, filters.page_size ?? 25);
  const offset = (page - 1) * pageSize;

  let query = db.from("employees").select("*", { count: "exact" });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.role) query = query.eq("role", filters.role);

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;
  return { data: (data ?? []) as Employee[], total: count ?? 0 };
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const db = createServerSupabaseClient();
  const { data } = await db.from("employees").select("*").eq("id", id).single();
  return data as Employee | null;
}

// -------------------------------------------------------
// SETTINGS
// -------------------------------------------------------

export async function getSettings(
  category?: string
): Promise<TerminalSetting[]> {
  const db = createServerSupabaseClient();
  let query = db.from("terminal_settings").select("*");
  if (category) query = query.eq("category", category);
  // Use a single order call — chaining .order().order() is not supported
  const { data } = await query.order("category", { ascending: true });
  return (data ?? []) as TerminalSetting[];
}
