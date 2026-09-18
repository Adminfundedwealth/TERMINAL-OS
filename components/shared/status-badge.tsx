import { Badge, type BadgeProps } from "@/components/ui/badge";

type StatusVariant = BadgeProps["variant"];

// Maps domain status strings to badge variants
const STATUS_VARIANT_MAP: Record<string, StatusVariant> = {
  // Account statuses
  ACTIVE: "success",
  INACTIVE: "neutral",
  SUSPENDED: "warning",
  BREACHED: "critical",
  COMPLETED: "info",
  EXPIRED: "neutral",

  // Order statuses
  PENDING: "neutral",
  OPEN: "info",
  PARTIALLY_FILLED: "warning",
  FILLED: "success",
  CANCELLED: "neutral",
  REJECTED: "critical",

  // Position
  LONG: "success",
  SHORT: "critical",

  // Risk statuses
  NORMAL: "success",
  WARNING: "warning",
  CRITICAL: "critical",
  RESTRICTED: "critical",

  // Provider / system
  CONNECTED: "success",
  DISCONNECTED: "neutral",
  ERROR: "critical",
  UNKNOWN: "neutral",
  HEALTHY: "success",

  // Employee
  ENABLED: "success",
  DISABLED: "neutral",

  // Alert
  TRIGGERED: "warning",
  DISABLED_ALERT: "neutral",

  // Severity
  INFO: "info",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const variant = STATUS_VARIANT_MAP[status.toUpperCase()] ?? "neutral";
  return <Badge variant={variant}>{label ?? status}</Badge>;
}
