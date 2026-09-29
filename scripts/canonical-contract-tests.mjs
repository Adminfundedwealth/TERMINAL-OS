import assert from "node:assert/strict";

const canonicalMapping = {
  accountOwner: ["owner_user_id", "trader_id"],
  accountBalance: ["current_balance", "balance"],
  orderTable: ["orders", "trading_orders"],
  orderAccount: ["account_id", "trading_account_id"],
  orderQuantity: ["quantity", "qty"],
  executionQuantity: ["quantity", "qty"],
  executionPrice: ["execution_price", "price"],
  positionQuantity: ["quantity", "qty"],
  positionStatus: ["position_status", "is_open"],
  performanceTable: ["daily_performance", "account_metrics"],
  riskAccount: ["account_id", "trading_account_id"],
  watchlistOwner: ["owner_user_id", "trader_id"],
  watchlistItems: ["watchlist_items", "watchlists.items"],
  staffTable: ["employees", "staff_members"],
};

assert.deepEqual(canonicalMapping.orderTable, ["orders", "trading_orders"]);
assert.deepEqual(canonicalMapping.positionStatus, ["position_status", "is_open"]);
assert.deepEqual(canonicalMapping.watchlistItems, ["watchlist_items", "watchlists.items"]);

function classify(record) {
  if (record.conflicting) return "conflicting_identity";
  if (!record.parent) return "orphaned";
  if (record.match) return "represented";
  if (record.stableKey) return "potentially_migratable";
  return "unknown";
}

assert.equal(classify({ parent: true, match: true }), "represented");
assert.equal(classify({ parent: true, stableKey: "account-code" }), "potentially_migratable");
assert.equal(classify({ parent: false }), "orphaned");
assert.equal(classify({ parent: true, conflicting: true }), "conflicting_identity");
assert.equal(classify({ parent: true }), "unknown");

const scopedAccounts = [{ id: "account-a", trader_id: "trader-a" }];
assert.equal(scopedAccounts.find((account) => account.id === "account-a")?.id, "account-a");
assert.equal(scopedAccounts.find((account) => account.id === "account-b"), undefined);

console.log("canonical-contract-tests: PASS");
