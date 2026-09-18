/**
 * Re-exports the role-permission map for display in the UI.
 * Keeps the RBAC logic in lib/rbac and this file as a bridge.
 */
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import type { EmployeeRole } from "@/types";

const ROLES: EmployeeRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "TRADING_OPERATIONS",
  "RISK_MANAGER",
  "SUPPORT",
  "VIEWER",
];

export const ROLE_PERMISSIONS: Record<EmployeeRole, string[]> = Object.fromEntries(
  ROLES.map((role) => [role, getPermissionsForRole(role)])
) as Record<EmployeeRole, string[]>;
