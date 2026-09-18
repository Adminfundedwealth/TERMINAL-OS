import { NextResponse } from "next/server";
import { withAuth, parsePagination, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS, requirePermission } from "@/lib/rbac/permissions";
import { getEmployees } from "@/server/services/operations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { writeActivityLog } from "@/lib/logger";
import { z } from "zod";

export const GET = withAuth(PERMISSIONS.EMPLOYEES_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const { page, pageSize } = parsePagination(searchParams);
  const { data, total } = await getEmployees({
    status: searchParams.get("status") ?? undefined,
    role: searchParams.get("role") ?? undefined,
    page,
    page_size: pageSize,
  });
  return NextResponse.json({ data, meta: { total, page, page_size: pageSize } });
});

const CreateEmployeeSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "TRADING_OPERATIONS", "RISK_MANAGER", "SUPPORT", "VIEWER"]),
  // Password will be set via Supabase invite/admin API — never stored in plaintext
});

export const POST = withAuth(PERMISSIONS.EMPLOYEES_CREATE, async ({ req, employee }) => {
  try {
    requirePermission(employee.role, PERMISSIONS.EMPLOYEES_CREATE);
    const body = await req.json();
    const parsed = CreateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid employee data.", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const { email, full_name, role } = parsed.data;
    const db = createServerSupabaseClient();

    // Create auth user via admin API then create employee record
    const { data: authUser, error: authError } = await db.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role },
    });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: { code: "CREATE_FAILED", message: "Failed to create employee account." } },
        { status: 500 }
      );
    }

    const newEmployee = {
      id: authUser.user.id,
      email,
      full_name,
      role,
      status: "ACTIVE" as const,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: empRecord, error: empError } = await db
      .from("employees")
      .insert(newEmployee as any)
      .select()
      .single();

    if (empError) {
      return NextResponse.json(
        { error: { code: "CREATE_FAILED", message: "Employee auth created but record insert failed." } },
        { status: 500 }
      );
    }

    await writeActivityLog({
      employee_id: employee.id,
      action: "EMPLOYEE_CREATED",
      module: "employees",
      resource: "employee",
      resource_id: authUser.user.id,
      result: "SUCCESS",
    });

    return NextResponse.json({ data: empRecord }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
});
