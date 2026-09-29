/** Server-owned contract for the future customer terminal API. */

export interface CustomerIdentity {
  auth_user_id: string;
  trader_id: string;
  email: string;
}

export interface CustomerAccountSummary {
  id: string;
  account_code: string;
  status: string;
  balance: number;
  equity: number | null;
  available_margin: number | null;
  used_margin: number | null;
  risk_state: string | null;
}

export interface CustomerAccountScope {
  identity: CustomerIdentity;
  account: CustomerAccountSummary;
  allowed_account_ids: string[];
}

export interface CustomerMarketDataAccess {
  provider: "canonical-backend";
  symbols: string[];
  stale: boolean;
  as_of: string | null;
}

export interface CustomerTerminalBackendContract {
  identity: CustomerIdentity;
  accounts: CustomerAccountSummary[];
  account: CustomerAccountSummary;
  positions: unknown[];
  orders: unknown[];
  executions: unknown[];
  account_metrics: unknown[];
  risk_state: unknown;
  watchlists: unknown[];
  market_data: CustomerMarketDataAccess;
}

/**
 * Customer routes must receive account scope from the authenticated session.
 * The browser may request a selected account, but the backend must authorize it.
 */
export const CUSTOMER_BACKEND_ROUTE_CONTRACT = {
  identity: "/api/customer/me",
  accounts: "/api/customer/accounts",
  account: "/api/customer/accounts/:accountId",
  positions: "/api/customer/accounts/:accountId/positions",
  orders: "/api/customer/accounts/:accountId/orders",
  executions: "/api/customer/accounts/:accountId/executions",
  metrics: "/api/customer/accounts/:accountId/metrics",
  risk: "/api/customer/accounts/:accountId/risk",
  watchlists: "/api/customer/watchlists",
  market_data: "/api/customer/market-data",
} as const;
