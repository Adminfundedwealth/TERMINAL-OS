import type { User } from "@supabase/supabase-js";
import type { Employee, EmployeeRole } from "@/types";

export function getTerminalOsAdminRole(email: string | undefined): EmployeeRole | null {
  if (!email) return null;
  const allowedEmails = (process.env.TERMINAL_OS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowedEmails.includes(email.trim().toLowerCase()) ? "SUPER_ADMIN" : null;
}

export function toTerminalOsEmployee(user: User, role: EmployeeRole): Employee {
  const createdAt = user.created_at ?? new Date(0).toISOString();
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return {
    id: user.id,
    email: user.email ?? "",
    full_name: typeof metadataName === "string" ? metadataName : user.email ?? "Admin",
    role,
    status: "ACTIVE",
    last_login_at: null,
    created_at: createdAt,
    updated_at: user.updated_at ?? createdAt,
  };
}