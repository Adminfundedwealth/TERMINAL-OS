import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = resolve(ROOT, ".env.local");
const REPORT_DIR = resolve(ROOT, "reports");
const JSON_FILE = resolve(REPORT_DIR, "phase-1-6-identity-reconciliation.json");
const MARKDOWN_FILE = resolve(ROOT, "PHASE_1_6_IDENTITY_RECONCILIATION.md");
const CSV_FILE = resolve(REPORT_DIR, "phase-1-6-migration-classification.csv");

function loadEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return values;
}

async function readConfig() {
  const env = loadEnv(await readFile(ENV_FILE, "utf8"));
  const url = env.TERMINAL_SUPABASE_URL;
  const key = env.TERMINAL_SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("TERMINAL_SUPABASE_URL and TERMINAL_SUPABASE_SECRET_KEY are required.");
  return { url: url.replace(/\/$/, ""), key };
}

function headers(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" };
}

async function getJson(url, key) {
  const response = await fetch(url, { headers: headers(key) });
  if (!response.ok) throw new Error(`Read-only request failed (${response.status}) for ${url.replace(/([?&])[^=]+=[^&]*/g, "$1[redacted]")}`);
  return response.json();
}

async function getRows(baseUrl, key, table, select, order = "id.asc") {
  const url = `${baseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=${encodeURIComponent(order)}&limit=1000`;
  return getJson(url, key);
}

async function getAuthUsers(baseUrl, key) {
  const rows = [];
  for (let page = 1; page <= 100; page += 1) {
    const batch = await getJson(`${baseUrl}/auth/v1/admin/users?page=${page}&per_page=1000`, key);
    const users = Array.isArray(batch.users) ? batch.users : [];
    rows.push(...users);
    if (users.length < 1000) break;
  }
  return rows.map((user) => ({
    id: String(user.id),
    email: user.email || null,
    created_at: user.created_at || null,
  })).sort((a, b) => a.id.localeCompare(b.id));
}

function groupBy(rows, key) {
  const result = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!result.has(value)) result.set(value, []);
    result.get(value).push(row);
  }
  return result;
}

function groupByNormalized(rows, key) {
  const result = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!value) continue;
    const normalized = String(value).trim().toLowerCase();
    if (!result.has(normalized)) result.set(normalized, []);
    result.get(normalized).push(row);
  }
  return result;
}

function classifyTrader(trader, publicUsersById, publicUsersByEmail) {
  const idMatches = publicUsersById.get(String(trader.external_id)) || [];
  const emailMatches = trader.email ? (publicUsersByEmail.get(String(trader.email).toLowerCase()) || []) : [];
  if (idMatches.length === 1) return { classification: "CONFIRMED", idMatches, emailMatches };
  if (idMatches.length > 1 || emailMatches.length > 1) return { classification: "AMBIGUOUS", idMatches, emailMatches };
  return { classification: "UNRESOLVED", idMatches, emailMatches };
}

function classifyStaff(staff, authById, authByEmail) {
  const idMatches = authById.get(String(staff.id)) || [];
  const emailMatches = staff.email ? (authByEmail.get(String(staff.email).toLowerCase()) || []) : [];
  if (idMatches.length === 1) return { classification: "CONFIRMED", idMatches, emailMatches };
  if (idMatches.length > 1 || emailMatches.length > 1) return { classification: "AMBIGUOUS", idMatches, emailMatches };
  return { classification: "UNRESOLVED", idMatches, emailMatches };
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildCsv(traders, accountsByTrader, publicUsersById) {
  const rows = [["entity", "source_id", "external_id", "public_user_id", "classification", "account_count", "candidate_public_user_ids", "reason"]];
  for (const trader of traders) {
    const matches = publicUsersById.get(String(trader.external_id)) || [];
    const classification = matches.length === 1 ? "CONFIRMED" : matches.length > 1 ? "AMBIGUOUS" : "UNRESOLVED";
    const reason = classification === "CONFIRMED" ? "Exact public.users.id to terminal_traders.external_id match" : "No proven exact public.users.id match";
    rows.push(["terminal_trader", trader.id, trader.external_id, matches[0]?.id || "", classification, (accountsByTrader.get(trader.id) || []).length, matches.map((item) => item.id).join("|"), reason]);
  }
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function buildMarkdown(report) {
  const counts = report.classification_counts;
  const unresolved = report.traders.filter((row) => row.classification !== "CONFIRMED");
  const unresolvedLines = unresolved.length
    ? unresolved.map((row) => `- \`${row.trader_id}\` external_id \`${row.external_id}\`, email \`${row.email || " unavailable"}\`, accounts: ${row.account_count}; exact public.users candidates: ${row.candidate_public_user_ids.join(", ") || "none"}; email-only candidates: ${row.email_candidate_ids.join(", ") || "none"}.`).join("\n")
    : "- None.";
  const confirmed = report.traders.filter((row) => row.classification === "CONFIRMED");
  const confirmedLines = confirmed.length
    ? confirmed.map((row) => `- \`${row.trader_id}\` -> external_id \`${row.external_id}\` -> public.users.id \`${row.public_user_id}\``).join("\n")
    : "- None.";
  const staffLines = report.staff.map((row) => `- \`${row.staff_id}\` email \`${row.email || " unavailable"}\`: **${row.classification}**; direct Auth candidates: ${row.auth_id_candidates.join(", ") || "none"}; email candidates: ${row.email_candidates.join(", ") || "none"}.`).join("\n") || "- None.";
  const multiAccountLines = report.account_ownership.traders_with_multiple_accounts.map((row) => `- \`${row.trader_id}\`: ${row.account_count} accounts`).join("\n") || "- None.";
  return `# Phase 1.6 Identity Reconciliation

Read-only report generated from canonical Supabase project \`${report.canonical_project}\`.

No insert, update, delete, schema, RLS, FK, authentication, broker, or market-data operation was performed.

## Auth -> public.users

- Auth users examined: ${report.auth.total}
- public.users examined: ${report.public_users.total}
- Exact \`public.users.id -> auth.users.id\` matches: ${report.public_users.auth_id_matches}
- Unmatched public.users rows: ${report.public_users.unmatched_ids}
- public.users rows with at least one case-insensitive Auth email candidate: ${report.public_users.email_candidate_matches}
- Duplicate public.users identity candidates: ${report.public_users.duplicate_id_groups}
- Duplicate public.users email groups: ${report.public_users.duplicate_email_groups}
- Duplicate Auth email groups: ${report.public_users.duplicate_auth_email_groups}
- Auth email matches are candidate evidence only; they are never treated as identity confirmation.

## public.users -> terminal_traders

- Confirmed: ${counts.CONFIRMED}
- Unresolved: ${counts.UNRESOLVED}
- Ambiguous: ${counts.AMBIGUOUS}
- Orphaned: ${counts.ORPHANED}
- Unknown: ${counts.UNKNOWN}

Confirmed mappings:
${confirmedLines}

Unresolved or non-confirmed traders:
${unresolvedLines}

## Staff Auth -> staff_members

${staffLines}

The active authentication code checks authenticated Supabase user ID against \`staff_members.id\`. This report does not modify that code.

## Account ownership

- Accounts examined: ${report.account_ownership.total_accounts}
- Valid \`trading_accounts.trader_id -> terminal_traders.id\` ownership: ${report.account_ownership.valid_accounts}
- Orphan accounts: ${report.account_ownership.orphan_accounts.length}
- Accounts attached to unresolved/ambiguous traders: ${report.account_ownership.identity_unresolved_accounts.length}
- Traders with multiple accounts:
${multiAccountLines}

## Migration rule

Only **CONFIRMED** identity relationships may later be eligible for automated migration. Email-only candidates, unresolved records, ambiguous records, and records from the inaccessible New Terminal project remain manual decisions.

## Access limitations

- The canonical SQL RPC was unavailable through the REST surface, so FK enforcement could not be independently verified.
- Auth admin data was available read-only; public.users data was available read-only.
- New Terminal protected rows were not queried with a privileged credential. No cross-project record was classified as duplicate or migratable.
`;
}

async function main() {
  const { url, key } = await readConfig();
  const [authUsers, publicUsers, traders, accounts, staff] = await Promise.all([
    getAuthUsers(url, key),
    getRows(url, key, "users", "id,email,clerk_id", "id.asc"),
    getRows(url, key, "terminal_traders", "id,external_id,email,display_name", "id.asc"),
    getRows(url, key, "trading_accounts", "id,trader_id,account_code,status", "id.asc"),
    getRows(url, key, "staff_members", "id,email,name,status", "id.asc"),
  ]);

  const publicUsersById = groupBy(publicUsers, "id");
  const publicUsersByEmail = groupByNormalized(publicUsers, "email");
  const authById = groupBy(authUsers, "id");
  const authByEmail = groupByNormalized(authUsers, "email");
  const accountsByTrader = groupBy(accounts, "trader_id");
  const traderById = groupBy(traders, "id");

  const traderRows = traders.map((trader) => {
    const result = classifyTrader(trader, publicUsersById, publicUsersByEmail);
    const accountsForTrader = accountsByTrader.get(trader.id) || [];
    return {
      trader_id: trader.id,
      external_id: trader.external_id,
      email: trader.email || null,
      display_name: trader.display_name || null,
      classification: result.classification,
      public_user_id: result.idMatches.length === 1 ? result.idMatches[0].id : null,
      candidate_public_user_ids: result.idMatches.map((row) => row.id).sort(),
      email_candidate_ids: result.emailMatches.map((row) => row.id).sort(),
      account_count: accountsForTrader.length,
      account_ids: accountsForTrader.map((row) => row.id).sort(),
      account_codes: accountsForTrader.map((row) => row.account_code).filter(Boolean).sort(),
    };
  });

  const staffRows = staff.map((row) => {
    const result = classifyStaff(row, authById, authByEmail);
    return {
      staff_id: row.id,
      email: row.email || null,
      name: row.name || null,
      status: row.status || null,
      classification: result.classification,
      auth_id_candidates: result.idMatches.map((item) => item.id).sort(),
      email_candidates: result.emailMatches.map((item) => item.id).sort(),
    };
  });

  const duplicatePublicIds = [...publicUsersById.values()].filter((rows) => rows.length > 1);
  const duplicatePublicEmails = [...publicUsersByEmail.values()].filter((rows) => rows.length > 1);
  const duplicateAuthEmails = [...authByEmail.values()].filter((rows) => rows.length > 1);
  const unmatchedPublicUsers = publicUsers.filter((row) => !authById.has(String(row.id)));
  const orphanAccounts = accounts.filter((row) => !traderById.has(String(row.trader_id)));
  const unresolvedTraderIds = new Set(traderRows.filter((row) => row.classification !== "CONFIRMED").map((row) => row.trader_id));
  const multipleAccounts = [...accountsByTrader.entries()].filter(([, rows]) => rows.length > 1).map(([trader_id, rows]) => ({ trader_id, account_count: rows.length }));
  const counts = { CONFIRMED: 0, UNRESOLVED: 0, AMBIGUOUS: 0, ORPHANED: 0, UNKNOWN: 0 };
  for (const row of traderRows) counts[row.classification] += 1;

  const report = {
    report: "PHASE_1_6_IDENTITY_RECONCILIATION",
    canonical_project: "nysrxvpjdlvzvcawysvh",
    read_only: true,
    writes_performed: 0,
    public_users: {
      total: publicUsers.length,
      auth_id_matches: publicUsers.length - unmatchedPublicUsers.length,
      unmatched_ids: unmatchedPublicUsers.length,
      email_candidate_matches: publicUsers.filter((row) => row.email && (authByEmail.get(String(row.email).trim().toLowerCase()) || []).length > 0).length,
      unmatched_records: unmatchedPublicUsers.map((row) => ({ id: row.id, email: row.email || null, clerk_id: row.clerk_id || null })),
      records: publicUsers.map((row) => ({
        id: row.id,
        email: row.email || null,
        clerk_id: row.clerk_id || null,
        auth_id_match: authById.has(String(row.id)),
        auth_email_candidate_ids: (row.email ? (authByEmail.get(String(row.email).trim().toLowerCase()) || []) : []).map((item) => item.id).sort(),
      })),
      duplicate_id_groups: duplicatePublicIds.length,
      duplicate_ids: duplicatePublicIds.map((rows) => rows.map((row) => row.id).sort()),
      duplicate_email_groups: duplicatePublicEmails.length,
      duplicate_auth_email_groups: duplicateAuthEmails.length,
      matching_evidence: ["exact public.users.id = auth.users.id", "case-insensitive trimmed email equality retained as candidate evidence only"],
    },
    auth: { total: authUsers.length },
    traders: traderRows,
    staff: staffRows,
    classification_counts: counts,
    account_ownership: {
      total_accounts: accounts.length,
      valid_accounts: accounts.length - orphanAccounts.length,
      orphan_accounts: orphanAccounts.map((row) => ({ id: row.id, trader_id: row.trader_id, account_code: row.account_code || null })),
      identity_unresolved_accounts: accounts.filter((row) => unresolvedTraderIds.has(row.trader_id)).map((row) => ({ id: row.id, trader_id: row.trader_id, account_code: row.account_code || null })),
      traders_with_multiple_accounts: multipleAccounts,
    },
    limitations: [
      "FK enforcement was not independently verified because the canonical SQL RPC was unavailable through REST.",
      "New Terminal protected rows were not queried with a privileged read-only credential.",
      "Email-only matches are not identity confirmation.",
    ],
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(JSON_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(MARKDOWN_FILE, buildMarkdown(report), "utf8");
  await writeFile(CSV_FILE, buildCsv(traders, accountsByTrader, publicUsersById), "utf8");
  console.log(JSON.stringify({ markdown: MARKDOWN_FILE, json: JSON_FILE, csv: CSV_FILE, writes_performed: 0, classification_counts: counts }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
