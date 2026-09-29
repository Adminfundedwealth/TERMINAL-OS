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
  return { data: [], total: 0 };
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

  return { data: [], total: 0 };
}

// -------------------------------------------------------
// EMPLOYEES
// -------------------------------------------------------

export async function getEmployees(
  filters: { status?: string; role?: string; page?: number; page_size?: number } = {}
): Promise<{ data: Employee[]; total: number }> {
  return { data: [], total: 0 };
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  return null;
}

// -------------------------------------------------------
// SETTINGS
// -------------------------------------------------------

export async function getSettings(
  category?: string
): Promise<TerminalSetting[]> {
  return [];
}
