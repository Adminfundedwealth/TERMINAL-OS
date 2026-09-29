import "server-only";
import { createCanonicalAdminClient } from "@/lib/supabase/canonical-admin";

export async function getRuleManagementContext() {
  const db = createCanonicalAdminClient();
  const [products, phases, versions, assignments, accounts, audit] = await Promise.all([
    db.from("products").select("*").order("code"),
    db.from("account_phases").select("*").order("sequence_no"),
    db.from("rule_versions").select("*").order("created_at", { ascending: false }),
    db.from("account_rule_assignments").select("id, account_id, rule_version_id, assigned_at, revoked_at").order("assigned_at", { ascending: false }),
    db.from("trading_accounts").select("id, account_code, status, product_id, phase_id, rule_version_id").order("created_at", { ascending: false }),
    db.from("rule_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
  ]);

  const failed = [products, phases, versions, assignments, accounts, audit].find((result) => result.error);
  if (failed?.error) throw failed.error;
  return {
    products: products.data ?? [],
    phases: phases.data ?? [],
    rule_versions: versions.data ?? [],
    assignments: assignments.data ?? [],
    accounts: accounts.data ?? [],
    audit: audit.data ?? [],
  };
}

export async function manageRuleConfiguration(request: Record<string, unknown>) {
  const db = createCanonicalAdminClient();
  const { data, error } = await db.rpc("manage_rule_configuration", { request });
  if (error) throw error;
  return data;
}