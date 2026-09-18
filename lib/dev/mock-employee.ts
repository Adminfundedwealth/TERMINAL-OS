/**
 * Local development mock employee.
 * Only used when DEV_MODE=true — never in production.
 */
import type { Employee } from "@/types";

export const DEV_EMPLOYEE: Employee = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@fundedwealth.com",
  full_name: "Dev Admin",
  role: "SUPER_ADMIN",
  status: "ACTIVE",
  last_login_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function isDevMode(): boolean {
  return process.env.DEV_MODE === "true";
}
