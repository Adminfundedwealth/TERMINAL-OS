"use client";

import { useState, useEffect, useCallback } from "react";
import { BrokerSecurityNotice } from "@/components/broker/broker-security-notice";
import { DataSourcesPanel } from "@/components/broker/data-sources-panel";
import { MarketDatabasePanel } from "@/components/broker/market-database-panel";
import { ChartDataDownloader } from "@/components/broker/chart-data-downloader";
import { BrokerProviderCard } from "@/components/broker/broker-provider-card";
import { HowItWorksSection } from "@/components/broker/how-it-works-section";
import { BROKER_PROVIDERS } from "@/lib/brokers/provider-definitions";
import type { BrokerCredentialRow, BrokerProviderDef } from "@/types/broker";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

type TabId = "connected" | "available";

interface BrokerApiKeysClientProps {
  canManage: boolean;
}

interface EnrichedRow extends BrokerCredentialRow {
  provider_name: string;
  capabilities: string[];
  runtime_integrated: boolean;
}

interface AccountOption {
  id: string;
  account_code: string;
  status: string;
  broker_provider: string;
}

export function BrokerApiKeysClient({ canManage }: BrokerApiKeysClientProps) {
  const [tab, setTab] = useState<TabId>("available");
  const [savedRows, setSavedRows] = useState<EnrichedRow[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
    id: number;
  } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    const id = Date.now();
    setToast({ type, message, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4500);
  }, []);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/terminal/broker");
      if (!res.ok) { setSavedRows([]); return; }
      const { data } = await res.json();
      const rows = (data ?? []) as EnrichedRow[];
      setSavedRows(rows);
      if (rows.length > 0) setTab("connected");
    } catch {
      setSavedRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/terminal/accounts?status=active&page_size=100");
      if (!res.ok) { setAccounts([]); return; }
      const { data } = await res.json();
      const rows = (data ?? []) as AccountOption[];
      setAccounts(rows);
      setSelectedAccountId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id ?? "");
    } catch {
      setAccounts([]);
      setSelectedAccountId("");
    }
  }, []);

  useEffect(() => { void fetchSaved(); void fetchAccounts(); }, [fetchAccounts, fetchSaved]);

  const isAccountScopedProvider = (providerId: string) => providerId === "dhan" || providerId === "zerodha";
  const visibleRows = savedRows.filter((row) =>
    !isAccountScopedProvider(row.broker_id) || row.trading_account_id === selectedAccountId
  );
  const savedByBrokerId = new Map(visibleRows.map((r) => [r.broker_id, r]));
  const connectedProviders = BROKER_PROVIDERS.filter((p) => savedByBrokerId.has(p.id));
  const availableProviders = BROKER_PROVIDERS.filter((p) => !savedByBrokerId.has(p.id));
  const unassignedMarketCredentialCount = savedRows.filter((row) =>
    isAccountScopedProvider(row.broker_id) && !row.trading_account_id
  ).length;

  async function handleSave(provider: BrokerProviderDef, credentials: Record<string, string>, label: string) {
    if (isAccountScopedProvider(provider.id) && !selectedAccountId) {
      throw new Error("Select an active trading account before saving Dhan or Kite credentials.");
    }
    const res = await fetch("/api/terminal/broker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broker_id: provider.id,
        label,
        credentials,
        ...(isAccountScopedProvider(provider.id) ? { trading_account_id: selectedAccountId } : {}),
      }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error?.message ?? "Save failed.");
    showToast("success", `${provider.name} credentials saved.`);
    await fetchSaved();
    setTab("connected");
  }

  async function handleUpdate(id: string, provider: BrokerProviderDef, credentials: Record<string, string>, label: string) {
    const res = await fetch(`/api/terminal/broker/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentials, label }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error?.message ?? "Update failed.");
    showToast("success", `${provider.name} credentials updated.`);
    await fetchSaved();
  }

  async function handleDelete(id: string, provider: BrokerProviderDef) {
    if (!confirm(`Delete ${provider.name} credentials? This cannot be undone.`)) return;
    const res = await fetch(`/api/terminal/broker/${id}`, { method: "DELETE" });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error?.message ?? "Delete failed.");
    showToast("success", `${provider.name} credentials deleted.`);
    await fetchSaved();
  }

  async function handleSetActive(id: string, provider: BrokerProviderDef) {
    const res = await fetch(`/api/terminal/broker/${id}/activate`, { method: "POST" });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error?.message ?? "Activation failed.");
    showToast("success", `${provider.name} set as active broker.`);
    await fetchSaved();
  }

  async function handleTest(id: string, _provider: BrokerProviderDef): Promise<string> {
    const res = await fetch(`/api/terminal/broker/${id}/test`, { method: "POST" });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error?.message ?? "Test failed.");
    const result = j.data as { success: boolean; message: string; implemented: boolean };
    if (!result.implemented) return `Not implemented: ${result.message}`;
    if (!result.success) throw new Error(result.message);
    await fetchSaved();
    return result.message;
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm shadow-xl ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-slate-900 text-emerald-400"
              : "border-red-500/30 bg-slate-900 text-red-400"
          }`}
        >
          {toast.type === "success"
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-xl font-semibold text-foreground">Broker API Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your broker accounts for live market data and trading. Keys are stored securely on the server.
        </p>
      </div>

      {/* Security Notice */}
      <BrokerSecurityNotice />

      <label className="block max-w-lg space-y-1.5 text-sm">
        <span className="font-medium text-foreground">Trading account for Dhan/Kite credentials</span>
        <select
          value={selectedAccountId}
          onChange={(event) => setSelectedAccountId(event.target.value)}
          className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="">Select an active account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.account_code || account.id} · {account.broker_provider}
            </option>
          ))}
        </select>
      </label>

      {unassignedMarketCredentialCount > 0 && (
        <div role="status" className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-200">
          {unassignedMarketCredentialCount} legacy Dhan/Kite credential row(s) are unassigned and unavailable to customer market-data requests. Add credentials for a specific active account; legacy rows were not reassigned.
        </div>
      )}

      {/* Connection Status - individual service rows with Test button */}
      <DataSourcesPanel />

      {/* Market Database - download panel */}
      <MarketDatabasePanel />

      {/* Chart Data Downloader - symbol selector */}
      <ChartDataDownloader />

      {/* Broker credential tabs */}
      <div className="flex items-center gap-0 border-b border-border">
        <TabBtn
          active={tab === "connected"}
          onClick={() => setTab("connected")}
          type="connected"
          label={`Connected (${connectedProviders.length})`}
        />
        <TabBtn
          active={tab === "available"}
          onClick={() => setTab("available")}
          type="available"
          label={`Available (${availableProviders.length})`}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading broker configurations...</span>
        </div>
      ) : (
        <>
          {/* CONNECTED TAB */}
          {tab === "connected" && (
            connectedProviders.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">No connected brokers yet.</p>
                <button
                  onClick={() => setTab("available")}
                  className="mt-2 text-sm text-primary hover:underline"
                >
                  Switch to Available to add one
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {connectedProviders.map((provider) => {
                  const row = savedByBrokerId.get(provider.id)!;
                  return (
                    <BrokerProviderCard
                      key={provider.id}
                      provider={provider}
                      savedRow={row}
                      canManage={canManage}
                      onSave={(c, l) => handleSave(provider, c, l)}
                      onUpdate={(c, l) => handleUpdate(row.id, provider, c, l)}
                      onDelete={() => handleDelete(row.id, provider)}
                      onSetActive={() => handleSetActive(row.id, provider)}
                      onTest={() => handleTest(row.id, provider)}
                      showToast={showToast}
                    />
                  );
                })}
              </div>
            )
          )}

          {/* AVAILABLE TAB */}
          {tab === "available" && (
            availableProviders.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                All providers are connected.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {availableProviders.map((provider) => (
                  <BrokerProviderCard
                    key={provider.id}
                    provider={provider}
                    savedRow={null}
                    canManage={canManage}
                    onSave={(c, l) => handleSave(provider, c, l)}
                    onUpdate={async () => {}}
                    onDelete={async () => {}}
                    onSetActive={async () => {}}
                    onTest={async () => ""}
                    showToast={showToast}
                  />
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* How It Works */}
      <HowItWorksSection />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  type,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  type: "connected" | "available";
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-cyan-500 text-cyan-400"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          type === "connected"
            ? active ? "bg-cyan-400" : "bg-muted-foreground"
            : active ? "border-2 border-cyan-400 bg-transparent" : "border-2 border-muted-foreground bg-transparent"
        }`}
      />
      {label}
    </button>
  );
}
