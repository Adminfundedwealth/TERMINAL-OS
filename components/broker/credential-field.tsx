"use client";

import { useState } from "react";
import { Eye, EyeOff, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CredentialField as CredentialFieldDef } from "@/types/broker";

interface CredentialFieldProps {
  field: CredentialFieldDef;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function CredentialField({
  field,
  value,
  onChange,
  error,
  disabled,
}: CredentialFieldProps) {
  const [visible, setVisible] = useState(false);

  // Always render as text when visible, password otherwise.
  // Use "new-password" to prevent browser autofill from injecting credentials.
  const inputType = field.sensitive && !visible ? "password" : "text";
  const fieldId = `broker-${field.key}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={fieldId} className="text-xs font-medium text-foreground">
          {field.label}
          {field.required && (
            <span className="text-red-400 ml-0.5" aria-hidden>*</span>
          )}
        </label>
      </div>

      <div className="relative">
        <input
          id={fieldId}
          name={`broker_${field.key}`}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          disabled={disabled}
          autoComplete="new-password"
          data-lpignore="true"
          data-1p-ignore="true"
          spellCheck={false}
          className={cn(
            "w-full rounded-md border bg-slate-900/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-1 focus:ring-cyan-500/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            field.sensitive ? "pr-10" : "",
            error ? "border-red-500/60" : "border-border"
          )}
          aria-invalid={!!error}
        />
        {field.sensitive && !disabled && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={visible ? "Hide" : "Show"}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : field.hint ? (
        <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
          <HelpCircle className="h-3 w-3 shrink-0" />
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}
