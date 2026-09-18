import { NextResponse } from "next/server";
import { withAuth, handleApiError } from "@/lib/auth/api-handler";
import { PERMISSIONS, requirePermission } from "@/lib/rbac/permissions";
import { getSettings } from "@/server/services/operations";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { writeActivityLog } from "@/lib/logger";
import { z } from "zod";

export const GET = withAuth(PERMISSIONS.SETTINGS_VIEW, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const data = await getSettings(category);
  return NextResponse.json({ data });
});

const UpdateSettingSchema = z.object({
  id: z.string().uuid(),
  value: z.unknown(),
});

export const PATCH = withAuth(PERMISSIONS.SETTINGS_MANAGE, async ({ req, employee }) => {
  try {
    requirePermission(employee.role, PERMISSIONS.SETTINGS_MANAGE);
    const body = await req.json();
    const parsed = UpdateSettingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid setting data." } }, { status: 400 });
    }

    const db = createServerSupabaseClient();
    const settingUpdate = {
      value: parsed.data.value,
      updated_by: employee.id,
      updated_at: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await db
      .from("terminal_settings")
      .update(settingUpdate as any)
      .eq("id", parsed.data.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: { code: "UPDATE_FAILED", message: "Setting update failed." } }, { status: 500 });

    await writeActivityLog({
      employee_id: employee.id,
      action: "SYSTEM_CONFIG_CHANGE",
      module: "settings",
      resource: "terminal_settings",
      resource_id: parsed.data.id,
      result: "SUCCESS",
    });

    return NextResponse.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
});
