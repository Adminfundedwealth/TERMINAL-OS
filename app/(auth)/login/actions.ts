"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getTerminalOsAdminRole } from "@/lib/auth/admin-access";

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

  const { createRouteHandlerSupabaseClient } = await import(
    "@/lib/supabase/route-handler-client"
  );
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

    if (!getTerminalOsAdminRole(data.user.email)) {
      await client.auth.signOut();
      return { error: "Access denied. This account is not authorized for Terminal OS." };
    }

    await recordEmployeeLogin(data.user.id);
    await writeActivityLog({
      employee_id: data.user.id,
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

  return {};
}
