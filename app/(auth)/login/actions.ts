"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isDevMode } from "@/lib/dev/mock-employee";

const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export interface LoginState {
  error?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as LoginState["fieldErrors"],
    };
  }

  // ── DEV MODE: accept any credentials ──────────────────────
  if (isDevMode()) {
    // Set a simple dev session cookie and redirect
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("dev_session", "active", {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });
    redirect("/dashboard");
  }

  // ── PRODUCTION: real Supabase auth ────────────────────────
  const { createRouteHandlerSupabaseClient } = await import(
    "@/lib/supabase/route-handler-client"
  );
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const { recordEmployeeLogin } = await import("@/lib/auth/session");
  const { writeActivityLog, serverLog } = await import("@/lib/logger");

  const { email, password } = parsed.data;

  try {
    const client = await createRouteHandlerSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      serverLog("warn", "auth", "login_failed", { email });
      return { error: "Invalid email or password." };
    }

    const adminClient = createServerSupabaseClient();
    const { data: employeeRow } = await adminClient
      .from("employees")
      .select("id, status")
      .eq("id", data.user.id)
      .single();

    const employee = employeeRow as { id: string; status: string } | null;

    if (!employee) {
      await client.auth.signOut();
      return { error: "Access denied. No employee record found." };
    }

    if (employee.status !== "ACTIVE") {
      await client.auth.signOut();
      return { error: "Your account is not active. Contact your administrator." };
    }

    await recordEmployeeLogin(employee.id);
    await writeActivityLog({
      employee_id: employee.id,
      action: "LOGIN",
      module: "auth",
      result: "SUCCESS",
    });
  } catch {
    return { error: "An error occurred. Please try again." };
  }

  redirect("/dashboard");
}

export async function forgotPasswordAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { fieldErrors: { email: ["Email is required"] } };

  if (!isDevMode()) {
    try {
      const { createRouteHandlerSupabaseClient } = await import(
        "@/lib/supabase/route-handler-client"
      );
      const client = await createRouteHandlerSupabaseClient();
      await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      });
    } catch {
      // Intentionally silent
    }
  }

  return {};
}
