export type MigrationClassification =
  | "represented"
  | "potentially_migratable"
  | "conflicting_identity"
  | "orphaned"
  | "unknown";

export const CANONICAL_FIELD_MAPPINGS = {
  accountOwner: { source: "owner_user_id", target: "trader_id" },
  accountBalance: { source: "current_balance", target: "balance" },
  orderTable: { source: "orders", target: "trading_orders" },
  orderAccount: { source: "account_id", target: "trading_account_id" },
  orderQuantity: { source: "quantity", target: "qty" },
  executionQuantity: { source: "quantity", target: "qty" },
  executionPrice: { source: "execution_price", target: "price" },
  positionQuantity: { source: "quantity", target: "qty" },
  positionStatus: { source: "position_status", target: "is_open" },
  performanceTable: { source: "daily_performance", target: "account_metrics" },
  riskAccount: { source: "account_id", target: "trading_account_id" },
  watchlistOwner: { source: "owner_user_id", target: "trader_id" },
  watchlistItems: { source: "watchlist_items", target: "watchlists.items" },
  staffTable: { source: "employees", target: "staff_members" },
} as const;

export interface DryRunRecord {
  source: string;
  source_id: string | null;
  canonical_id: string | null;
  stable_key: string | null;
  has_canonical_match: boolean;
  has_conflicting_match: boolean;
  has_required_parent: boolean;
}

export function classifyDryRunRecord(record: DryRunRecord): MigrationClassification {
  if (record.has_conflicting_match) return "conflicting_identity";
  if (!record.has_required_parent) return "orphaned";
  if (record.has_canonical_match) return "represented";
  if (record.stable_key) return "potentially_migratable";
  return "unknown";
}

export function classifyUnverifiedCrossProjectRecord(): MigrationClassification {
  return "unknown";
}
