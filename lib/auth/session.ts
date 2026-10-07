import "server-only";
import type { Employee } from "@/types";
import { UnauthenticatedError } from "@/lib/rbac/permissions";
import { getTerminalOsAdminRole, toTerminalOsEmployee } from "@/lib/auth/admin-access";

export async function getAuthenticatedEmployee(req?: Request): Promise<Employee | null> {
  const authorization = req?.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+([^\s]+)$/i);

  // An explicitly supplied but malformed or non-Bearer credential must not
  // fall back to a different employee session from cookies.
  if (authorization !== null && authorization !== undefined && !bearerMatch) {
    return null;
  }

  const accessToken = bearerMatch?.[1];

  try {
    const { createRouteHandlerSupabaseClient } = await import(
      "@/lib/supabase/route-handler-client"
    );

    const client = await createRouteHandlerSupabaseClient(accessToken);
    const { data: { user }, error } = accessToken
      ? await client.auth.getUser(accessToken)
      : await client.auth.getUser();
    if (error || !user) return null;

    const role = getTerminalOsAdminRole(user.email);
    return role ? toTerminalOsEmployee(user, role) : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedCustomerFromRequest(
  req: Request
): Promise<{ userId: string; accessToken: string } | null> {
  const match = req.headers.get("authorization")?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return null;

  try {
    const { createRouteHandlerSupabaseClient } = await import(
      "@/lib/supabase/route-handler-client"
    );
    const client = await createRouteHandlerSupabaseClient(match[1]);
    const { data: { user }, error } = await client.auth.getUser(match[1]);
    if (error || !user) return null;
    return { userId: user.id, accessToken: match[1] };
  } catch {
    return null;
  }
}

export async function requireAuthenticatedEmployee(req?: Request): Promise<Employee> {
  const employee = await getAuthenticatedEmployee(req);
  if (!employee) throw new UnauthenticatedError();
  return employee;
}

export async function recordEmployeeLogin(employeeId: string): Promise<void> {
  void employeeId;
}
