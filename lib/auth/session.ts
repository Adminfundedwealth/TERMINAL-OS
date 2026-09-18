import "server-only";
import type { Employee } from "@/types";
import { UnauthenticatedError } from "@/lib/rbac/permissions";
import { isDevMode, DEV_EMPLOYEE } from "@/lib/dev/mock-employee";

export async function getAuthenticatedEmployee(): Promise<Employee | null> {
  // DEV MODE — return mock SUPER_ADMIN without touching Supabase
  if (isDevMode()) {
    // Check dev session cookie is present
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const devSession = cookieStore.get("dev_session");
    if (devSession?.value === "active") return DEV_EMPLOYEE;
    return null;
  }

  // PRODUCTION — real Supabase auth
  try {
    const { createRouteHandlerSupabaseClient } = await import(
      "@/lib/supabase/route-handler-client"
    );
    const { createServerSupabaseClient } = await import("@/lib/supabase/server");

    const client = await createRouteHandlerSupabaseClient();
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;

    const adminClient = createServerSupabaseClient();
    const { data, error: empError } = await adminClient
      .from("employees")
      .select("*")
      .eq("id", user.id)
      .single();

    if (empError || !data) return null;
    const employee = data as Employee;
    if (employee.status !== "ACTIVE") return null;
    return employee;
  } catch {
    return null;
  }
}

export async function requireAuthenticatedEmployee(): Promise<Employee> {
  const employee = await getAuthenticatedEmployee();
  if (!employee) throw new UnauthenticatedError();
  return employee;
}

export async function recordEmployeeLogin(employeeId: string): Promise<void> {
  if (isDevMode()) return;
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const client = createServerSupabaseClient();
  await client
    .from("employees")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", employeeId);
}
