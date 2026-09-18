/**
 * Role-Based Access Control for FundedWealth Terminal OS.
 */
import type { EmployeeRole } from "@/types";

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard:view",
  ACCOUNTS_VIEW: "accounts:view",
  ACCOUNTS_CREATE: "accounts:create",
  ACCOUNTS_UPDATE: "accounts:update",
  ACCOUNTS_SUSPEND: "accounts:suspend",
  ACCOUNTS_DELETE: "accounts:delete",
  ORDERS_VIEW: "orders:view",
  ORDERS_CANCEL: "orders:cancel",
  EXECUTIONS_VIEW: "executions:view",
  POSITIONS_VIEW: "positions:view",
  POSITIONS_CLOSE: "positions:close",
  RISK_VIEW: "risk:view",
  RISK_EVENTS_VIEW: "risk:events:view",
  RISK_INTERVENE: "risk:intervene",
  RISK_RESTRICT_ACCOUNT: "risk:restrict_account",
  PERFORMANCE_VIEW: "performance:view",
  INSTRUMENTS_VIEW: "instruments:view",
  INSTRUMENTS_MANAGE: "instruments:manage",
  MARKET_DATA_VIEW: "market_data:view",
  PROVIDERS_VIEW: "providers:view",
  PROVIDERS_MANAGE: "providers:manage",
  WEBSOCKET_VIEW: "websocket:view",
  WEBSOCKET_MANAGE: "websocket:manage",
  SYSTEM_HEALTH_VIEW: "system_health:view",
  WATCHLISTS_VIEW: "watchlists:view",
  ALERTS_VIEW: "alerts:view",
  JOURNAL_VIEW: "journal:view",
  ACTIVITY_VIEW: "activity:view",
  AUDIT_VIEW: "audit:view",
  EMPLOYEES_VIEW: "employees:view",
  EMPLOYEES_CREATE: "employees:create",
  EMPLOYEES_UPDATE: "employees:update",
  EMPLOYEES_DISABLE: "employees:disable",
  PERMISSIONS_VIEW: "permissions:view",
  PERMISSIONS_MANAGE: "permissions:manage",
  SETTINGS_VIEW: "settings:view",
  SETTINGS_MANAGE: "settings:manage",
  // Broker API Keys — ADMIN/SUPER_ADMIN only
  BROKER_VIEW: "broker:view",
  BROKER_MANAGE: "broker:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ROLE_PERMISSIONS: Record<EmployeeRole, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS) as Permission[],

  ADMIN: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ACCOUNTS_VIEW, PERMISSIONS.ACCOUNTS_CREATE, PERMISSIONS.ACCOUNTS_UPDATE, PERMISSIONS.ACCOUNTS_SUSPEND,
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.EXECUTIONS_VIEW,
    PERMISSIONS.POSITIONS_VIEW, PERMISSIONS.POSITIONS_CLOSE,
    PERMISSIONS.RISK_VIEW, PERMISSIONS.RISK_EVENTS_VIEW, PERMISSIONS.RISK_INTERVENE, PERMISSIONS.RISK_RESTRICT_ACCOUNT,
    PERMISSIONS.PERFORMANCE_VIEW,
    PERMISSIONS.INSTRUMENTS_VIEW, PERMISSIONS.INSTRUMENTS_MANAGE,
    PERMISSIONS.MARKET_DATA_VIEW,
    PERMISSIONS.PROVIDERS_VIEW,
    PERMISSIONS.WEBSOCKET_VIEW,
    PERMISSIONS.SYSTEM_HEALTH_VIEW,
    PERMISSIONS.WATCHLISTS_VIEW, PERMISSIONS.ALERTS_VIEW, PERMISSIONS.JOURNAL_VIEW,
    PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.EMPLOYEES_VIEW, PERMISSIONS.EMPLOYEES_CREATE, PERMISSIONS.EMPLOYEES_UPDATE, PERMISSIONS.EMPLOYEES_DISABLE,
    PERMISSIONS.PERMISSIONS_VIEW,
    PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.BROKER_VIEW, PERMISSIONS.BROKER_MANAGE,
  ],

  TRADING_OPERATIONS: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ACCOUNTS_VIEW, PERMISSIONS.ACCOUNTS_UPDATE,
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.ORDERS_CANCEL,
    PERMISSIONS.EXECUTIONS_VIEW,
    PERMISSIONS.POSITIONS_VIEW,
    PERMISSIONS.PERFORMANCE_VIEW,
    PERMISSIONS.INSTRUMENTS_VIEW,
    PERMISSIONS.MARKET_DATA_VIEW,
    PERMISSIONS.PROVIDERS_VIEW,
    PERMISSIONS.WEBSOCKET_VIEW,
    PERMISSIONS.SYSTEM_HEALTH_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
  ],

  RISK_MANAGER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ACCOUNTS_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.POSITIONS_VIEW,
    PERMISSIONS.RISK_VIEW, PERMISSIONS.RISK_EVENTS_VIEW, PERMISSIONS.RISK_INTERVENE, PERMISSIONS.RISK_RESTRICT_ACCOUNT,
    PERMISSIONS.PERFORMANCE_VIEW,
    PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.AUDIT_VIEW,
  ],

  SUPPORT: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ACCOUNTS_VIEW,
    PERMISSIONS.ORDERS_VIEW, PERMISSIONS.EXECUTIONS_VIEW, PERMISSIONS.POSITIONS_VIEW,
    PERMISSIONS.PERFORMANCE_VIEW,
    PERMISSIONS.WATCHLISTS_VIEW, PERMISSIONS.ALERTS_VIEW, PERMISSIONS.JOURNAL_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
  ],

  VIEWER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ACCOUNTS_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.POSITIONS_VIEW,
    PERMISSIONS.PERFORMANCE_VIEW,
    PERMISSIONS.SYSTEM_HEALTH_VIEW,
  ],
};

export function getPermissionsForRole(role: EmployeeRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role: EmployeeRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function hasAllPermissions(role: EmployeeRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function hasAnyPermission(role: EmployeeRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function requirePermission(role: EmployeeRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionDeniedError(`Role ${role} does not have permission: ${permission}`);
  }
}

export class PermissionDeniedError extends Error {
  public readonly code = "PERMISSION_DENIED";
  public readonly statusCode = 403;
  constructor(message = "Access denied.") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export class UnauthenticatedError extends Error {
  public readonly code = "UNAUTHENTICATED";
  public readonly statusCode = 401;
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}
