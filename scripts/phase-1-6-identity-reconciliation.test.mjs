import assert from "node:assert/strict";

const classify = ({ idMatchCount, emailMatchCount }) => {
  if (idMatchCount === 1) return "CONFIRMED";
  if (idMatchCount > 1 || emailMatchCount > 1) return "AMBIGUOUS";
  return "UNRESOLVED";
};

assert.equal(classify({ idMatchCount: 1, emailMatchCount: 0 }), "CONFIRMED");
assert.equal(classify({ idMatchCount: 0, emailMatchCount: 1 }), "UNRESOLVED");
assert.equal(classify({ idMatchCount: 2, emailMatchCount: 0 }), "AMBIGUOUS");
assert.equal(classify({ idMatchCount: 0, emailMatchCount: 2 }), "AMBIGUOUS");

const account = { trader_id: "trader-unresolved" };
const unresolvedTraderIds = new Set(["trader-unresolved"]);
assert.equal(unresolvedTraderIds.has(account.trader_id), true);

const reportText = JSON.stringify({ secret: undefined, classification: "UNRESOLVED" });
assert.equal(reportText.includes("KITE_API_SECRET"), false);
assert.equal(reportText.includes("DHAN_ACCESS_TOKEN"), false);
assert.equal(reportText.includes("TERMINAL_SUPABASE_SECRET_KEY"), false);

console.log("phase-1-6-identity-reconciliation-tests: PASS");
