"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type LoginState } from "@/app/(auth)/login/actions";
import { CheckCircle2, Loader2 } from "lucide-react";

const initialState: LoginState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState);
  const submitted = !state.error && !state.fieldErrors && isPending === false && Object.keys(state).length === 0;

  // After first submit with no error, show success (action returns {})
  return (
    <form action={formAction} className="space-y-4">
      {submitted ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>If that email is registered, a reset link has been sent.</span>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300 text-xs font-medium">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="employee@fundedwealth.com"
              required
              disabled={isPending}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
            {state.fieldErrors?.email && (
              <p className="text-xs text-red-400">{state.fieldErrors.email[0]}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <><Loader2 className="animate-spin" /> Sending…</> : "Send Reset Link"}
          </Button>
        </>
      )}
      <div className="text-center">
        <Link href="/login" className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
          ← Back to Sign In
        </Link>
      </div>
    </form>
  );
}
