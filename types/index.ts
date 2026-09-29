/**
 * Application domain types for FundedWealth Terminal OS.
 * These are the typed representations used throughout the application.
 */

// -------------------------------------------------------
// EMPLOYEE / AUTH
// -------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EmployeeRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "TRADING_OPERATIONS"
  | "RISK_MANAGER"
  | "SUPPORT"
  | "VIEWER";

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Employee {
  id: string;
  email: string;
  full_name: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSession {
  employee: Employee;
}

// -------------------------------------------------------
// TRADING ACCOUNTS
// -------------------------------------------------------

// Status values stored lowercase in live DB ("active", "suspended", etc.)
export type AccountStatus =
  | "active"
  | "suspended"
  | "locked"
  | "inactive"
  | "closed";

export interface TradingAccount {
  id: string;
  /** FK → terminal_traders.id — the trader who owns this account */
  trader_id: string;
  /** FK → challenge_accounts.id — the challenge this account is scoped to */
  challenge_id: string | null;
  account_code: string;
  broker_provider: string;
  broker_client_id: string;
  /** AES-256 encrypted blob — NEVER expose in API responses */
  broker_credentials_encrypted: string | null;
  balance: number;
  available_margin: number;
  used_margin: number;
  status: AccountStatus;
  locked_reason: string | null;
  locked_at: string | null;
  unlocked_at: string | null;
  created_at: string;
  updated_at: string;
  daily_profit_cap_until: string | null;
  first_payout_approved_at: string | null;
}

// -------------------------------------------------------
// ORDERS  (table: trading_orders — NOT the payment `orders` table)
// -------------------------------------------------------

export type OrderSide = "BUY" | "SELL";

// Live DB includes broker-specific types like "SL-M", "SL" in addition to standard types
export type OrderType = "MARKET" | "LIMIT" | "SL" | "SL-M" | string;

// Live DB product types
export type ProductType = "MIS" | "NRML" | "CNC" | "BO" | "CO" | string;

export type OrderValidity = "DAY" | "IOC" | string;

export type OrderStatus =
  | "PENDING"
  | "OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELLED"
  | "REJECTED"
  | "EXPIRED"
  | string; // live DB may contain broker-native status strings

export interface Order {
  id: string;
  trading_account_id: string;
  broker_order_id: string | null;
  parent_order_id: string | null;
  order_group_id: string | null;
  order_group_type: string | null;
  symbol: string;
  token: string;
  /** Exchange segment: "NSE" | "NFO" | "BSE" | "CDS" | "MCX" etc. */
  segment: string;
  instrument_type: string | null;
  side: OrderSide;
  order_type: OrderType;
  product_type: ProductType;
  validity: OrderValidity;
  qty: number;
  price: number | null;
  trigger_price: number | null;
  target_price: number | null;
  stoploss_price: number | null;
  trailing_sl: number | null;
  filled_qty: number;
  pending_qty: number | null;
  avg_fill_price: number | null;
  status: OrderStatus;
  reject_reason: string | null;
  is_amo: boolean;
  placed_at: string;
  filled_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  idempotency_key: string | null;
  correlation_id: string | null;
}

// -------------------------------------------------------
// EXECUTIONS  (table: executions)
// -------------------------------------------------------

export interface Execution {
  id: string;
  trading_account_id: string;
  order_id: string;
  /** FK → positions.id — nullable, set when position is created/updated */
  position_id: string | null;
  /** Broker-assigned trade/fill identifier */
  broker_trade_id: string | null;
  symbol: string;
  token: string;
  segment: string;
  side: OrderSide;
  /** Filled quantity */
  qty: number;
  /** Fill price */
  price: number;
  /** Exchange-confirmed timestamp — nullable, may lag executed_at */
  exchange_timestamp: string | null;
  executed_at: string;
}

// -------------------------------------------------------
// POSITIONS  (table: positions)
// -------------------------------------------------------

export type PositionSide = "LONG" | "SHORT";

export interface Position {
  id: string;
  trading_account_id: string;
  symbol: string;
  token: string;
  segment: string;
  instrument_type: string | null;
  product_type: string;
  side: PositionSide;
  qty: number;
  avg_price: number;
  /** Last traded price — nullable if market data not synced */
  current_price: number | null;
  realized_pnl: number;
  unrealized_pnl: number;
  buy_qty: number;
  sell_qty: number;
  buy_avg: number;
  sell_avg: number;
  margin_used: number;
  /** true = OPEN position, false = CLOSED position */
  is_open: boolean;
  opened_at: string;
  closed_at: string;
  updated_at: string;
}

// -------------------------------------------------------
// RISK
// -------------------------------------------------------

export type RiskStatus =
  | "NORMAL"
  | "WARNING"
  | "CRITICAL"
  | "BREACHED"
  | "RESTRICTED";

export type RiskEventType =
  | "DAILY_LOSS_WARNING"
  | "DAILY_LOSS_BREACH"
  | "MAX_DRAWDOWN_WARNING"
  | "MAX_DRAWDOWN_BREACH"
  | "EXPOSURE_WARNING"
  | "POSITION_LIMIT"
  | "TRADING_RESTRICTION";

export type RiskEventSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface RiskEvent {
  id: string;
  trading_account_id: string;
  event_type: RiskEventType;
  severity: RiskEventSeverity;
  challenge_id: string | null;
  rule_type: string;
  threshold_value: number | null;
  actual_value: number | null;
  metadata: Record<string, unknown>;
  acknowledged: boolean;
  created_at: string;
}

export interface AccountMetric {
  id: string;
  trading_account_id: string;
  challenge_id: string | null;
  date: string;
  starting_balance: number;
  ending_balance: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  gross_profit: number;
  gross_loss: number;
  max_drawdown: number;
  daily_loss: number;
  peak_balance: number;
  avg_win: number | null;
  avg_loss: number | null;
  largest_win: number | null;
  largest_loss: number | null;
  profit_factor: number | null;
}

// -------------------------------------------------------
// INSTRUMENTS
// -------------------------------------------------------

export type InstrumentType =
  | "EQ"
  | "FUT"
  | "OPT"
  | "INDEX"
  | "CURRENCY"
  | "COMMODITY";

export type OptionType = "CE" | "PE";

export type InstrumentStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";

export interface Instrument {
  id: string;
  symbol: string;
  trading_symbol: string;
  exchange: string;
  segment: string;
  instrument_type: InstrumentType;
  expiry: string | null;
  strike: number | null;
  option_type: OptionType | null;
  lot_size: number;
  tick_size: number;
  status: InstrumentStatus;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------
// WATCHLISTS
// -------------------------------------------------------

export interface Watchlist {
  id: string;
  trader_id: string;
  name: string;
  color: string;
  icon: string;
  items: Json;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------
// JOURNAL
// -------------------------------------------------------

export interface JournalEntry {
  id: string;
  trading_account_id: string;
  date: string;
  title: string;
  entry: string;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------
// ALERTS
// -------------------------------------------------------

export type AlertStatus = "ACTIVE" | "TRIGGERED" | "DISABLED";

export interface Alert {
  id: string;
  trading_account_id: string;
  owner_user_id: string;
  alert_type: string;
  symbol: string | null;
  condition: string;
  status: AlertStatus;
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------
// PROVIDERS
// -------------------------------------------------------

export type ProviderType =
  | "MARKET_DATA"
  | "ORDER_EXECUTION"
  | "WEBSOCKET"
  | "INSTRUMENT_MASTER";

export type ProviderStatus =
  | "CONNECTED"
  | "DISCONNECTED"
  | "ERROR"
  | "UNKNOWN";

export interface ProviderConfig {
  id: string;
  provider_name: string;
  provider_type: ProviderType;
  environment: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderHealth {
  id: string;
  provider_id: string;
  status: ProviderStatus;
  last_heartbeat_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  checked_at: string;
  // Joined from provider_config
  provider_name?: string;
  provider_type?: ProviderType;
}

// -------------------------------------------------------
// TERMINAL SETTINGS
// -------------------------------------------------------

export interface TerminalSetting {
  id: string;
  category: string;
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

// -------------------------------------------------------
// ACTIVITY / AUDIT
// -------------------------------------------------------

export interface ActivityLog {
  id: string;
  timestamp: string;
  employee_id: string | null;
  action: string;
  module: string;
  resource: string | null;
  resource_id: string | null;
  result: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
}

// -------------------------------------------------------
// API RESPONSE WRAPPERS
// -------------------------------------------------------

export interface ApiSuccess<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    page_size?: number;
    has_more?: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    // Only present in development
    details?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// -------------------------------------------------------
// PAGINATION
// -------------------------------------------------------

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface SortParams {
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// -------------------------------------------------------
// DASHBOARD SUMMARY
// -------------------------------------------------------

export interface DashboardSummary {
  total_accounts: number;
  active_accounts: number;
  orders_today: number;
  executions_today: number;
  open_positions: number;
  total_exposure: number;
  risk_events_today: number;
  system_health: SystemHealthSummary;
}

export interface SystemHealthSummary {
  database: ServiceHealthStatus;
  market_data: ServiceHealthStatus;
  websocket: ServiceHealthStatus;
  order_service: ServiceHealthStatus;
  risk_service: ServiceHealthStatus;
}

export type ServiceHealthStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "UNKNOWN";
