import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS, requirePermission } from "@/lib/rbac/permissions";
import { getEmployeeById } from "@/server/services/operations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { writeActivityLog } from "@/lib/logger";
import { z } from "zod";

export const GET = withAuth(PERMISSIONS.EMPLOYEES_VIEW, async ({ req }) => {
  try {
    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "ID required." } }, { status: 400 });
    const employee = await getEmployeeById(id);
    if (!employee) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Employee not found." } }, { status: 404 });
    return NextResponse.json({ data: employee });
  } catch (err) {
    return handleApiError(err);
  }
});

const UpdateSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "TRADING_OPERATIONS", "RISK_MANAGER", "SUPPORT", "VIEWER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  full_name: z.string().min(2).optional(),
});

export const PATCH = withAuth(PERMISSIONS.EMPLOYEES_UPDATE, async ({ req, employee: actor }) => {
  try {
    requirePermission(actor.role, PERMISSIONS.EMPLOYEES_UPDATE);

    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: { code: "BAD_REQUEST", message: "ID required." } }, { status: 400 });

    // Prevent self-demotion
    if (id === actor.id) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Cannot modify your own employee record." } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid update data." } }, { status: 400 });
    }

    const db = createServerSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await db
      .from("employees")
      .update({ role: parsed.data.role, status: parsed.data.status, full_name: parsed.data.full_name, updated_at: new Date().toISOString() } as any)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: { code: "UPDATE_FAILED", message: "Update failed." } }, { status: 500 });

    await writeActivityLog({
      employee_id: actor.id,
      action: "EMPLOYEE_UPDATED",
      module: "employees",
      resource: "employee",
      resource_id: id,
      result: "SUCCESS",
      metadata: { changes: parsed.data },
    });

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
});
