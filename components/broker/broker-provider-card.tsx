"use client";

import { useState } from "react";
import { cn, formatDate } from "@/lib/utils";
import type { BrokerProviderDef, BrokerConnectionRow } from "@/types/broker";
import { CredentialField } from "@/components/broker/credential-field";
import { Button } from "@/components/ui/button";
import {
  KeyRound,
  Pencil,
  Star,
  PowerOff,
  FlaskConical,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface BrokerProviderCardProps {
  provider: BrokerProviderDef;
  savedRow: BrokerConnectionRow | null;
  canManage: boolean;
  onSave: (credentials: Record<string, string>, label: string) => Promise<void>;
  onUpdate: (credentials: Record<string, string>, label: string) => Promise<void>;
  onDeactivate: () => Promise<void>;
  onSetActive: () => Promise<void>;
  onTest: () => Promise<string>;
  showToast: (type: "success" | "error", message: string) => void;
}

export function BrokerProviderCard({
  provider,
  savedRow,
  canManage,
  onSave,
  onUpdate,
  onDeactivate,
  onSetActive,
  onTest,
  showToast,
}: BrokerProviderCardProps) {
  const isSaved = savedRow !== null;
  const isActive = savedRow?.is_active ?? false;
  const isConnected = savedRow?.is_connected ?? false;

  const [editing, setEditing] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>(
    () => Object.fromEntries(provider.fields.map((f) => [f.key, ""]))
  );
  const [label] = useState(savedRow?.label ?? "Default");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errors: Record<string, string> = {};
    for (const field of provider.fields) {
      const val = (formValues[field.key] ?? "").trim();
      if (field.required && !val) {
        errors[field.key] = `${field.label} is required`;
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function clearForm() {
    setFormValues(Object.fromEntries(provider.fields.map((f) => [f.key, ""])));
    setValidationErrors({});
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const trimmed = Object.fromEntries(
        Object.entries(formValues).map(([k, v]) => [k, v.trim()])
      );
      if (isSaved) {
        await onUpdate(trimmed, label);
        setEditing(false);
      } else {
        await onSave(trimmed, label);
      }
      clearForm();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const msg = await onTest();
      const isNotImpl = msg.toLowerCase().includes("not implemented");
      setTestResult({ type: isNotImpl ? "info" : "success", message: msg });
      if (!isNotImpl) showToast("success", msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Test failed.";
      setTestResult({ type: "error", message: msg });
      showToast("error", msg);
    } finally {
      setTesting(false);
    }
  }

  async function handleSetActive() {
    setActivating(true);
    try {
      await onSetActive();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Activation failed.");
    } finally {
      setActivating(false);
    }
  }

  async function handleDeactivate() {
    setDeactivating(true);
    try {
      await onDeactivate();
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Deactivation failed.");
    } finally {
      setDeactivating(false);
    }
  }

  const credentialCount = provider.fields.length;

  // CONNECTED / SAVED CARD - compact view
  if (isSaved && !editing) {
    return (
      <div
        className={cn(
          "rounded-xl border bg-card transition-all",
          isActive ? "border-primary/50 shadow-md shadow-primary/5" : "border-border"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <ProviderAvatar provider={provider} isConnected={isConnected} />
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-sm font-semibold text-foreground">{provider.name}</h3>
                {isActive && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
                {!provider.runtimeIntegrated && (
                  <span className="text-[10px] text-muted-foreground/70 bg-muted border border-border px-1.5 py-0.5 rounded-full">
                    Config only
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {provider.description}
              </p>
            </div>
          </div>
          <a
            href={provider.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Capability badges */}
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {provider.capabilities.map((cap) => (
            <span
              key={cap}
              className="text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border/60 px-2 py-0.5 rounded"
            >
              {cap}
            </span>
          ))}
        </div>

        {/* Connected info */}
        <div className="px-4 pb-3 flex items-center gap-2 text-xs text-muted-foreground">
          {isConnected ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          )}
          <span>
                {credentialCount} key{credentialCount !== 1 ? "s" : ""} configured · {savedRow.environment}
            {savedRow.created_at ? ` | Added ${formatDate(savedRow.created_at)}` : ""}
          </span>
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className={cn(
              "mx-4 mb-3 rounded-md px-3 py-2 text-xs border",
              testResult.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : testResult.type === "info"
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            )}
          >
            {testResult.message}
          </div>
        )}

        {/* Actions */}
        {canManage && (
          <div className="flex items-center gap-2 px-4 pb-4">
            {provider.runtimeIntegrated && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={handleTest}
                disabled={testing}
              >
                {testing
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <FlaskConical className="h-3.5 w-3.5" />}
                {testing ? "Testing..." : "Test"}
              </Button>
            )}
            {!isActive && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                onClick={handleSetActive}
                disabled={activating}
              >
                {activating
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Star className="h-3.5 w-3.5" />}
                {activating ? "Activating..." : "Activate"}
              </Button>
            )}
            {isActive && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={handleDeactivate}
                disabled={deactivating}
              >
                {deactivating
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <PowerOff className="h-3.5 w-3.5" />}
                {deactivating ? "Deactivating..." : "Deactivate"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => { clearForm(); setEditing(true); setTestResult(null); }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        )}
      </div>
    );
  }

  // AVAILABLE / EDITING CARD - form open
  return (
    <div
      className={cn(
        "rounded-xl border bg-card",
        editing ? "border-primary/30" : "border-border"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <ProviderAvatar provider={provider} isConnected={false} />
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground">{provider.name}</h3>
              {!provider.runtimeIntegrated && (
                <span className="text-[10px] text-muted-foreground/70 bg-muted border border-border px-1.5 py-0.5 rounded-full">
                  Config only
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {provider.description}
            </p>
          </div>
        </div>
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Capability badges */}
      <div className="flex flex-wrap gap-1.5 px-4 py-3 border-b border-border">
        {provider.capabilities.map((cap) => (
          <span
            key={cap}
            className="text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border/60 px-2 py-0.5 rounded"
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Credential form */}
      <div className="p-4 space-y-4">
        {provider.fields.map((field) => (
          <CredentialField
            key={field.key}
            field={field}
            value={formValues[field.key] ?? ""}
            onChange={(v) => {
              setFormValues((prev) => ({ ...prev, [field.key]: v }));
              if (validationErrors[field.key]) {
                setValidationErrors((prev) => {
                  const next = { ...prev };
                  delete next[field.key];
                  return next;
                });
              }
            }}
            error={validationErrors[field.key]}
            disabled={!canManage || saving}
          />
        ))}

        {canManage ? (
          <div className="flex items-center gap-2 pt-1">
            <Button
              className="flex-1 gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold h-9 text-sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Save Keys
                </>
              )}
            </Button>
            {editing && (
              <Button
                variant="outline"
                className="h-9 text-sm"
                onClick={() => { setEditing(false); clearForm(); }}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            Read-only access. Contact an administrator to manage credentials.
          </p>
        )}
      </div>
    </div>
  );
}

// Provider avatar with connection indicator dot
function ProviderAvatar({
  provider,
  isConnected,
}: {
  provider: BrokerProviderDef;
  isConnected: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full text-white text-sm font-bold",
          provider.color
        )}
      >
        {provider.name.charAt(0)}
      </div>
      {isConnected && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
      )}
    </div>
  );
}
