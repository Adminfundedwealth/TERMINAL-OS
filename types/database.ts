/**
 * Database type definitions aligned with the live FundedWealth development database.
 *
 * IMPORTANT: This database is the canonical FundedWealth platform DB.
 * It is NOT a Terminal-OS-only schema.
 *
 * Only the tables Terminal OS reads/writes are typed here.
 * Other platform tables (users, kyc_profiles, payouts, etc.) are omitted
 * as Terminal OS never touches them.
 *
 * Key differences from original Terminal OS schema design:
 *   - trading_accounts uses trader_id (not owner_user_id), balance (not current_balance)
 *   - Trading orders are in `trading_orders` — NOT `orders` (which is a payment table)
 *   - executions uses qty/price (not quantity/fill_price), no fees/execution_status
 *   - positions uses is_open boolean (not status string), qty/avg_price/current_price
 *   - daily_performance equivalent is `account_metrics`
 *   - staff auth is in staff_members (not employees)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // -------------------------------------------------------
      // TRADING ACCOUNTS
      // -------------------------------------------------------
      trading_accounts: {
        Row: {
          id: string;
          trader_id: string;
          challenge_id: string | null;
          account_code: string;
          broker_provider: string;
          broker_client_id: string;
          /** AES-256 encrypted — never select or return this */
          broker_credentials_encrypted: string | null;
          balance: number;
          available_margin: number;
          used_margin: number;
          status: string; // lowercase: "active" | "suspended" | "locked" | "inactive" | "closed"
          locked_reason: string | null;
          locked_at: string | null;
          unlocked_at: string | null;
          created_at: string;
          updated_at: string;
          daily_profit_cap_until: string | null;
          first_payout_approved_at: string | null;
        };
        Insert: {
          id?: string;
          trader_id: string;
          challenge_id?: string | null;
          account_code: string;
          broker_provider: string;
          broker_client_id: string;
          broker_credentials_encrypted?: string | null;
          balance: number;
          available_margin?: number;
          used_margin?: number;
          status?: string;
          locked_reason?: string | null;
          locked_at?: string | null;
          unlocked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          balance?: number;
          available_margin?: number;
          used_margin?: number;
          status?: string;
          locked_reason?: string | null;
          locked_at?: string | null;
          unlocked_at?: string | null;
          updated_at?: string;
        };
      };

      // -------------------------------------------------------
      // TRADING ORDERS  (NOT the payment `orders` table)
      // -------------------------------------------------------
      trading_orders: {
        Row: {
          id: string;
          trading_account_id: string;
          broker_order_id: string | null;
          parent_order_id: string | null;
          order_group_id: string | null;
          order_group_type: string | null;
          symbol: string;
          token: string;
          segment: string;
          instrument_type: string | null;
          side: string;
          order_type: string;
          product_type: string;
          validity: string;
          qty: number;
          price: number | null;
          trigger_price: number | null;
          target_price: number | null;
          stoploss_price: number | null;
          trailing_sl: number | null;
          filled_qty: number;
          pending_qty: number | null;
          avg_fill_price: number | null;
          status: string;
          reject_reason: string | null;
          is_amo: boolean;
          placed_at: string;
          filled_at: string | null;
          cancelled_at: string | null;
          updated_at: string;
          idempotency_key: string | null;
          correlation_id: string | null;
        };
        Insert: never; // Terminal OS reads only
        Update: never; // Terminal OS reads only
      };

      // -------------------------------------------------------
      // EXECUTIONS
      // -------------------------------------------------------
      executions: {
        Row: {
          id: string;
          trading_account_id: string;
          order_id: string;
          position_id: string | null;
          broker_trade_id: string | null;
          symbol: string;
          token: string;
          segment: string;
          side: string;
          qty: number;
          price: number;
          exchange_timestamp: string | null;
          executed_at: string;
        };
        Insert: never; // Terminal OS reads only
        Update: never; // Terminal OS reads only
      };

      // -------------------------------------------------------
      // POSITIONS
      // -------------------------------------------------------
      positions: {
        Row: {
          id: string;
          trading_account_id: string;
          symbol: string;
          token: string;
          segment: string;
          instrument_type: string | null;
          product_type: string;
          side: string;
          qty: number;
          avg_price: number;
          current_price: number | null;
          realized_pnl: number;
          unrealized_pnl: number;
          buy_qty: number;
          sell_qty: number;
          buy_avg: number;
          sell_avg: number;
          margin_used: number;
          is_open: boolean;
          opened_at: string;
          closed_at: string;
          updated_at: string;
        };
        Insert: never; // Terminal OS reads only
        Update: never; // Terminal OS reads only
      };

      // -------------------------------------------------------
      // ACCOUNT METRICS  (daily EOD performance — replaces daily_performance)
      // -------------------------------------------------------
      account_metrics: {
        Row: {
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
        };
        Insert: never;
        Update: never;
      };

      // -------------------------------------------------------
      // RISK EVENTS
      // -------------------------------------------------------
      risk_events: {
        Row: {
          id: string;
          trading_account_id: string;
          challenge_id: string | null;
          event_type: string;
          severity: string; // lowercase: "warning" | "critical" | "info"
          rule_type: string;
          threshold_value: number | null;
          actual_value: number | null;
          metadata: Json;
          acknowledged: boolean;
          created_at: string;
        };
        Insert: never;
        Update: {
          acknowledged?: boolean;
        };
      };

      // -------------------------------------------------------
      // WATCHLISTS  (symbols stored as JSONB array, no watchlist_items table)
      // -------------------------------------------------------
      watchlists: {
        Row: {
          id: string;
          trader_id: string;
          name: string;
          color: string;
          icon: string;
          /** [{token: string, symbol: string, segment: string}] */
          items: Json;
          sort_order: number;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trader_id: string;
          name: string;
          color?: string;
          icon?: string;
          items?: Json;
          sort_order?: number;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
          icon?: string;
          items?: Json;
          sort_order?: number;
          is_default?: boolean;
          updated_at?: string;
        };
      };

      // -------------------------------------------------------
      // JOURNAL ENTRIES
      // -------------------------------------------------------
      journal_entries: {
        Row: {
          id: string;
          trading_account_id: string;
          date: string;
          title: string;
          entry: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trading_account_id: string;
          date: string;
          title: string;
          entry: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          entry?: string;
          updated_at?: string;
        };
      };

      // -------------------------------------------------------
      // ALERTS
      // -------------------------------------------------------
      alerts: {
        Row: {
          id: string;
          trading_account_id: string;
          alert_type: string;
          symbol: string | null;
          condition: string;
          status: string;
          triggered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          trading_account_id: string;
          alert_type: string;
          symbol?: string | null;
          condition: string;
          status?: string;
          triggered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          triggered_at?: string | null;
          updated_at?: string;
        };
      };

      // -------------------------------------------------------
      // STAFF MEMBERS  (admin auth — custom password+TOTP, not Supabase Auth)
      // -------------------------------------------------------
      staff_members: {
        Row: {
          id: string;
          email: string;
          name: string;
          /** bcrypt hash — NEVER return in API responses */
          password_hash: string;
          totp_secret: string | null;
          totp_enabled: boolean;
          status: string; // "active" | "inactive" | "suspended"
          failed_login_attempts: number;
          locked_until: string | null;
          force_password_change: boolean;
          temp_password_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          password_hash: string;
          totp_secret?: string | null;
          totp_enabled?: boolean;
          status?: string;
          failed_login_attempts?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          password_hash?: string;
          totp_secret?: string | null;
          totp_enabled?: boolean;
          status?: string;
          failed_login_attempts?: number;
          locked_until?: string | null;
          force_password_change?: boolean;
          updated_at?: string;
        };
      };

      // -------------------------------------------------------
      // STAFF SESSIONS
      // -------------------------------------------------------
      staff_sessions: {
        Row: {
          id: string;
          staff_id: string;
          token_hash: string;
          device_fingerprint: string;
          browser: string;
          os: string;
          ip_address: string;
          geolocation: Json | null;
          is_new_device: boolean;
          created_at: string;
          last_activity: string;
          expires_at: string;
          invalidated_at: string | null;
        };
        Insert: {
          id?: string;
          staff_id: string;
          token_hash: string;
          device_fingerprint?: string;
          browser?: string;
          os?: string;
          ip_address?: string;
          geolocation?: Json | null;
          is_new_device?: boolean;
          created_at?: string;
          last_activity?: string;
          expires_at: string;
          invalidated_at?: string | null;
        };
        Update: {
          last_activity?: string;
          invalidated_at?: string | null;
        };
      };

      // -------------------------------------------------------
      // CHALLENGE ACCOUNTS  (challenge definition per trader)
      // -------------------------------------------------------
      challenge_accounts: {
        Row: {
          id: string;
          trader_id: string;
          type: string;
          plan: string;
          initial_balance: number;
          current_balance: number;
          peak_balance: number;
          profit_target_pct: number;
          daily_loss_limit_pct: number;
          max_drawdown_pct: number;
          min_trading_days: number;
          max_calendar_days: number | null;
          status: string;
          started_at: string;
          expires_at: string | null;
          passed_at: string | null;
          failed_at: string | null;
          fail_reason: string | null;
          promoted_from: string | null;
          created_at: string;
          updated_at: string;
          first_position_at: string | null;
        };
        Insert: never;
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
