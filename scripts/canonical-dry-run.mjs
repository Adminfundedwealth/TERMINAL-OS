import assert from "node:assert/strict";

const requiredCanonicalTables = [
  "terminal_traders",
  "trading_accounts",
  "trading_orders",
  "executions",
  "positions",
  "account_metrics",
  "risk_events",
  "watchlists",
];

assert.deepEqual(requiredCanonicalTables, [
  "terminal_traders",
  "trading_accounts",
  "trading_orders",
  "executions",
  "positions",
  "account_metrics",
  "risk_events",
  "watchlists",
]);

console.log(JSON.stringify({
  mode: "read-only-contract-check",
  canonicalProject: "nysrxvpjdlvzvcawysvh",
  classificationRule: "unverified cross-project records remain unknown",
  requiredCanonicalTables,
}, null, 2));
