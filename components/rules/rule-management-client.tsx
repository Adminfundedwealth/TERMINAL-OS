"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Save } from "lucide-react";

interface Product { id: string; code: string; name: string; description: string | null; status: string }
interface Phase { id: string; product_id: string; code: string; name: string; sequence_no: number; phase_type: "challenge" | "funded"; status: string }
interface RuleVersion { id: string; product_id: string; phase_id: string | null; version: string; rules: Record<string, unknown>; status: string; effective_from: string | null; created_at: string }
interface Account { id: string; account_code: string | null; status: string; product_id: string | null; phase_id: string | null; rule_version_id: string | null }
interface Assignment { id: string; account_id: string; rule_version_id: string; assigned_at: string; revoked_at: string | null }
interface AuditEntry { id: string; actor_email: string; action: string; entity_type: string; entity_id: string; before_state: unknown; after_state: unknown; created_at: string }
interface Context { products: Product[]; phases: Phase[]; rule_versions: RuleVersion[]; accounts: Account[]; assignments: Assignment[]; audit: AuditEntry[] }

const fieldClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function RuleManagementClient() {
  const [context, setContext] = useState<Context | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState("");
  const [phaseId, setPhaseId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [editingProductId, setEditingProductId] = useState("");
  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [phaseCode, setPhaseCode] = useState("");
  const [phaseName, setPhaseName] = useState("");
  const [phaseSequence, setPhaseSequence] = useState("0");
  const [phaseType, setPhaseType] = useState<"challenge" | "funded">("challenge");
  const [version, setVersion] = useState("");
  const [rulesJson, setRulesJson] = useState("{}");

  async function load() {
    setError("");
    try {
      const response = await fetch("/api/terminal/rules", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Canonical rule data is unavailable");
      setContext(result.data as Context);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Canonical rule data is unavailable");
    }
  }

  useEffect(() => { void load(); }, []);

  async function mutate(action: string, payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/terminal/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Rule change failed");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Rule change failed");
    } finally {
      setBusy(false);
    }
  }

  function submitProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("save_product", {
      ...(editingProductId ? { id: editingProductId } : {}),
      code: productCode, name: productName, description: productDescription,
    }).then(() => {
      setEditingProductId(""); setProductCode(""); setProductName(""); setProductDescription("");
    });
  }

  function submitPhase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate("save_phase", {
      product_id: productId, code: phaseCode, name: phaseName,
      sequence_no: Number(phaseSequence), phase_type: phaseType,
    }).then(() => { setPhaseCode(""); setPhaseName(""); });
  }

  function submitVersion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let rules: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(rulesJson);
      if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
      rules = parsed as Record<string, unknown>;
    } catch {
      setError("Rules must be a valid JSON object");
      return;
    }
    void mutate("create_rule_version", { product_id: productId, phase_id: phaseId || null, version, rules })
      .then(() => setVersion(""));
  }

  const phases = context?.phases.filter((phase) => phase.product_id === productId) ?? [];
  const activeVersion = context?.rule_versions.find((item) => item.id === versionId);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>
      {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
      {!context && !error && <p className="text-sm text-muted-foreground">Loading canonical records…</p>}

      {context && <>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Products and Plans</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitProduct}>
                <div><Label htmlFor="product-code">Code</Label><Input id="product-code" value={productCode} onChange={(event) => setProductCode(event.target.value)} required /></div>
                <div><Label htmlFor="product-name">Name</Label><Input id="product-name" value={productName} onChange={(event) => setProductName(event.target.value)} required /></div>
                <div className="sm:col-span-2"><Label htmlFor="product-description">Description</Label><Input id="product-description" value={productDescription} onChange={(event) => setProductDescription(event.target.value)} /></div>
                <Button type="submit" disabled={busy}><Save className="mr-2 h-4 w-4" />{editingProductId ? "Save product" : "Add product"}</Button>
                {editingProductId && <Button type="button" variant="outline" onClick={() => { setEditingProductId(""); setProductCode(""); setProductName(""); setProductDescription(""); }}>Cancel</Button>}
              </form>
              <div className="divide-y divide-border">
                {context.products.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span><strong>{product.code}</strong> · {product.name} <span className="text-muted-foreground">({product.status})</span></span>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingProductId(product.id); setProductCode(product.code); setProductName(product.name); setProductDescription(product.description ?? ""); }}>Edit</Button>
                </div>)}
                {context.products.length === 0 && <p className="py-3 text-sm text-muted-foreground">No canonical products exist yet.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Account Phases</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitPhase}>
                <div className="sm:col-span-2"><Label htmlFor="phase-product">Product</Label><select id="phase-product" className={fieldClass} value={productId} onChange={(event) => { setProductId(event.target.value); setPhaseId(""); }} required><option value="">Select product</option>{context.products.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></div>
                <div><Label htmlFor="phase-code">Phase code</Label><Input id="phase-code" value={phaseCode} onChange={(event) => setPhaseCode(event.target.value)} required /></div>
                <div><Label htmlFor="phase-name">Phase name</Label><Input id="phase-name" value={phaseName} onChange={(event) => setPhaseName(event.target.value)} required /></div>
                <div><Label htmlFor="phase-sequence">Sequence</Label><Input id="phase-sequence" type="number" min="0" value={phaseSequence} onChange={(event) => setPhaseSequence(event.target.value)} required /></div>
                <div><Label htmlFor="phase-type">Type</Label><select id="phase-type" className={fieldClass} value={phaseType} onChange={(event) => setPhaseType(event.target.value as "challenge" | "funded")}><option value="challenge">Challenge</option><option value="funded">Funded</option></select></div>
                <Button type="submit" disabled={busy || !productId}><Save className="mr-2 h-4 w-4" />Add phase</Button>
              </form>
              <div className="divide-y divide-border">
                {context.phases.map((phase) => <div key={phase.id} className="py-2 text-sm"><strong>{context.products.find((item) => item.id === phase.product_id)?.code ?? "Unknown product"}</strong> · {phase.sequence_no}. {phase.name} <span className="text-muted-foreground">({phase.phase_type}, {phase.status})</span></div>)}
                {context.phases.length === 0 && <p className="py-3 text-sm text-muted-foreground">No canonical phases exist yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Rule Versions</CardTitle></CardHeader>
          <CardContent className="grid gap-5 xl:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
            <form className="space-y-3" onSubmit={submitVersion}>
              <div><Label htmlFor="rule-product">Product</Label><select id="rule-product" className={fieldClass} value={productId} onChange={(event) => { setProductId(event.target.value); setPhaseId(""); }} required><option value="">Select product</option>{context.products.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></div>
              <div><Label htmlFor="rule-phase">Phase</Label><select id="rule-phase" className={fieldClass} value={phaseId} onChange={(event) => setPhaseId(event.target.value)}><option value="">Product-wide</option>{phases.map((item) => <option key={item.id} value={item.id}>{item.sequence_no}. {item.name}</option>)}</select></div>
              <div><Label htmlFor="rule-version">Version</Label><Input id="rule-version" value={version} onChange={(event) => setVersion(event.target.value)} placeholder="Enter version" required /></div>
              <div><Label htmlFor="rule-json">Rule configuration (JSON)</Label><textarea id="rule-json" className={`${fieldClass} min-h-56 font-mono text-xs`} value={rulesJson} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setRulesJson(event.target.value)} required /></div>
              <Button type="submit" disabled={busy || !productId}><Save className="mr-2 h-4 w-4" />Create draft version</Button>
            </form>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Product / phase</th><th className="py-2 pr-3">Version</th><th className="py-2 pr-3">State</th><th className="py-2 pr-3">Created</th><th className="py-2">Actions</th></tr></thead>
                <tbody>{context.rule_versions.map((item) => <tr key={item.id} className="border-b align-top">
                  <td className="py-2 pr-3">{context.products.find((product) => product.id === item.product_id)?.code ?? "Unknown"} / {context.phases.find((phase) => phase.id === item.phase_id)?.name ?? "Product-wide"}</td>
                  <td className="py-2 pr-3">{item.version}</td><td className="py-2 pr-3">{item.status}</td><td className="py-2 pr-3 whitespace-nowrap">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="py-2"><div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setVersionId(item.id); setRulesJson(JSON.stringify(item.rules, null, 2)); }}>View rules</Button>
                    {item.status === "draft" && <Button size="sm" onClick={() => void mutate("publish_rule_version", { id: item.id })} disabled={busy}>Publish</Button>}
                    {item.status === "active" && <Button size="sm" variant="outline" onClick={() => void mutate("unpublish_rule_version", { id: item.id })} disabled={busy}>Retire</Button>}
                  </div></td>
                </tr>)}</tbody>
              </table>
              {context.rule_versions.length === 0 && <p className="py-4 text-sm text-muted-foreground">No rule versions exist. Add only verified commercial terms.</p>}
              {activeVersion && <pre className="mt-4 max-h-72 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">{JSON.stringify(activeVersion.rules, null, 2)}</pre>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Apply Effective Rules</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div><Label htmlFor="assign-account">Existing account</Label><select id="assign-account" className={fieldClass} value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Select account</option>{context.accounts.map((account) => <option key={account.id} value={account.id}>{account.account_code ?? account.id} · {account.status}</option>)}</select></div>
            <div><Label htmlFor="assign-rule">Published rule version</Label><select id="assign-rule" className={fieldClass} value={versionId} onChange={(event) => setVersionId(event.target.value)}><option value="">Select version</option>{context.rule_versions.filter((item) => item.status === "active").map((item) => <option key={item.id} value={item.id}>{item.version} · {context.products.find((product) => product.id === item.product_id)?.code}</option>)}</select></div>
            <Button disabled={busy || !accountId || !versionId} onClick={() => void mutate("apply_rule_version", { account_id: accountId, id: versionId })}>Apply to account</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Assignment History</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Account</th><th className="py-2 pr-3">Rule version</th><th className="py-2 pr-3">Assigned</th><th className="py-2">State</th></tr></thead><tbody>
              {context.assignments.map((assignment) => <tr key={assignment.id} className="border-b"><td className="py-2 pr-3">{context.accounts.find((account) => account.id === assignment.account_id)?.account_code ?? assignment.account_id}</td><td className="py-2 pr-3">{context.rule_versions.find((item) => item.id === assignment.rule_version_id)?.version ?? assignment.rule_version_id}</td><td className="py-2 pr-3">{new Date(assignment.assigned_at).toLocaleString()}</td><td className="py-2">{assignment.revoked_at ? "Revoked" : "Current"}</td></tr>)}
            </tbody></table>
            {context.assignments.length === 0 && <p className="py-3 text-sm text-muted-foreground">No rule assignments exist.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Rule Change Audit</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase text-muted-foreground"><th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Actor</th><th className="py-2 pr-3">Action</th><th className="py-2 pr-3">Entity</th><th className="py-2">Change</th></tr></thead><tbody>
              {context.audit.map((entry) => <tr key={entry.id} className="border-b"><td className="py-2 pr-3 whitespace-nowrap">{new Date(entry.created_at).toLocaleString()}</td><td className="py-2 pr-3">{entry.actor_email}</td><td className="py-2 pr-3">{entry.action}</td><td className="py-2 pr-3">{entry.entity_type}</td><td className="py-2"><details><summary className="cursor-pointer text-primary">Inspect</summary><pre className="mt-2 max-w-xl overflow-auto rounded-md border bg-muted/30 p-2 text-xs">{JSON.stringify({ before: entry.before_state, after: entry.after_state }, null, 2)}</pre></details></td></tr>)}
            </tbody></table>
            {context.audit.length === 0 && <p className="py-3 text-sm text-muted-foreground">No rule changes have been recorded.</p>}
          </CardContent>
        </Card>
      </>}
    </div>
  );
}