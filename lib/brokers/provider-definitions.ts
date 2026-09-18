/**
 * Static provider definitions for all 7 broker providers.
 * Source of truth: MrChartist india-s-best-option-hub audit.
 *
 * Only Dhan has a runtime backend integration (runtimeIntegrated = true).
 * The other 6 are configuration-only UI entries.
 */
import type { BrokerProviderDef } from "@/types/broker";

export const BROKER_PROVIDERS: BrokerProviderDef[] = [
  // 1. DHAN
  {
    id: "dhan",
    name: "Dhan",
    description:
      "Primary broker - provides Option Chain, Greeks, Live LTP, OI Data and Expiry List. Only provider with a live backend runtime integration.",
    color: "bg-cyan-500",
    textColor: "text-cyan-400",
    capabilities: ["Option Chain", "Live LTP", "Greeks", "OI Data", "Expiry List"],
    fields: [
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "Enter Dhan Client ID",
        hint: "From Dhan Developer Console - My Apps",
        required: true,
        sensitive: false,
      },
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "Enter Dhan Access Token",
        hint: "From Dhan Developer Console - My Apps",
        required: true,
        sensitive: true,
      },
    ],
    docsUrl: "https://dhanhq.co/docs/v2/",
    runtimeIntegrated: true,
    apiBase: "https://api.dhan.co/v2",
    wsBase: "wss://api-feed.dhan.co",
  },

  // 2. ZERODHA (KITE)
  {
    id: "zerodha",
    name: "Zerodha (Kite)",
    description:
      "India's largest broker. Access live data via Kite Connect API with WebSocket streaming. Configuration only - no runtime backend integration yet.",
    color: "bg-red-500",
    textColor: "text-red-400",
    capabilities: ["Option Chain", "Live Quotes", "WebSocket Streaming", "Historical Data"],
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "Enter Kite Connect API Key",
        hint: "From Kite Developer Console - My Apps",
        required: true,
        sensitive: false,
      },
      {
        key: "api_secret",
        label: "API Secret",
        placeholder: "Enter Kite Connect API Secret",
        hint: "From Kite Developer Console - My Apps",
        required: true,
        sensitive: true,
      },
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "Enter session Access Token",
        hint: "Generated after login flow via /session/token",
        required: true,
        sensitive: true,
      },
    ],
    docsUrl: "https://kite.trade/docs/connect/v3/",
    runtimeIntegrated: false,
  },

  // 3. ANGEL ONE (SMARTAPI)
  {
    id: "angel_one",
    name: "Angel One (SmartAPI)",
    description:
      "Full-featured SmartAPI with option chain, order placement, and portfolio tracking. Configuration only - no runtime backend integration yet.",
    color: "bg-orange-500",
    textColor: "text-orange-400",
    capabilities: ["Option Chain", "Live Quotes", "Order Placement", "Portfolio"],
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "Enter SmartAPI Key",
        hint: "From Angel One Portal - My Apps",
        required: true,
        sensitive: false,
      },
      {
        key: "client_id",
        label: "Client ID",
        placeholder: "Enter Angel One Client ID",
        hint: "Your Angel One trading client ID",
        required: true,
        sensitive: false,
      },
      {
        key: "password",
        label: "Password / MPIN",
        placeholder: "Enter login password or MPIN",
        hint: "Your Angel One login password or MPIN",
        required: true,
        sensitive: true,
      },
      {
        key: "totp_secret",
        label: "TOTP Secret",
        placeholder: "Enter TOTP secret for 2FA",
        hint: "For automated TOTP generation (optional)",
        required: false,
        sensitive: true,
      },
    ],
    docsUrl: "https://smartapi.angelone.in/docs",
    runtimeIntegrated: false,
  },

  // 4. UPSTOX
  {
    id: "upstox",
    name: "Upstox",
    description:
      "Upstox API v2 with market data, option chain, and advanced order types. Configuration only - no runtime backend integration yet.",
    color: "bg-violet-500",
    textColor: "text-violet-400",
    capabilities: ["Option Chain", "Market Data", "Orders", "Portfolio"],
    fields: [
      {
        key: "api_key",
        label: "API Key",
        placeholder: "Enter Upstox API Key",
        hint: "From Upstox Developer Console",
        required: true,
        sensitive: false,
      },
      {
        key: "api_secret",
        label: "API Secret",
        placeholder: "Enter Upstox API Secret",
        hint: "From Upstox Developer Console",
        required: true,
        sensitive: true,
      },
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "Enter OAuth Access Token",
        hint: "Generated via OAuth2 redirect flow",
        required: true,
        sensitive: true,
      },
    ],
    docsUrl: "https://upstox.com/developer/api-documentation/",
    runtimeIntegrated: false,
  },

  // 5. 5PAISA
  {
    id: "fivepaisa",
    name: "5paisa",
    description:
      "5paisa Connect API for live market data, option chain, and trading. Configuration only - no runtime backend integration yet.",
    color: "bg-blue-500",
    textColor: "text-blue-400",
    capabilities: ["Option Chain", "Market Data", "Orders"],
    fields: [
      {
        key: "app_name",
        label: "App Name",
        placeholder: "Enter 5paisa App Name",
        hint: "Your registered 5paisa app name",
        required: true,
        sensitive: false,
      },
      {
        key: "app_source",
        label: "App Source",
        placeholder: "Enter App Source ID",
        hint: "From 5paisa developer portal",
        required: true,
        sensitive: false,
      },
      {
        key: "user_id",
        label: "User ID",
        placeholder: "Enter User ID / Client Code",
        hint: "Your 5paisa client/user ID",
        required: true,
        sensitive: false,
      },
      {
        key: "encryption_key",
        label: "Encryption Key",
        placeholder: "Enter Encryption Key",
        hint: "From 5paisa developer portal",
        required: true,
        sensitive: true,
      },
    ],
    docsUrl: "https://dev-openapi.5paisa.com/",
    runtimeIntegrated: false,
  },

  // 6. FYERS
  {
    id: "fyers",
    name: "Fyers",
    description:
      "Fyers API with historical data, TradingView charts, and order management. Configuration only - no runtime backend integration yet.",
    color: "bg-green-500",
    textColor: "text-green-400",
    capabilities: ["Option Chain", "Historical Data", "TradingView Charts", "Orders"],
    fields: [
      {
        key: "app_id",
        label: "App ID",
        placeholder: "Enter Fyers App ID",
        hint: "From Fyers API portal - My Apps",
        required: true,
        sensitive: false,
      },
      {
        key: "secret_key",
        label: "Secret Key",
        placeholder: "Enter Fyers Secret Key",
        hint: "From Fyers API portal - My Apps",
        required: true,
        sensitive: true,
      },
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "Enter Fyers Access Token",
        hint: "Generated via OAuth2 auth code flow",
        required: true,
        sensitive: true,
      },
    ],
    docsUrl: "https://myapi.fyers.in/docs/",
    runtimeIntegrated: false,
  },

  // 7. ALICE BLUE
  {
    id: "alice_blue",
    name: "Alice Blue",
    description:
      "Alice Blue ANT API for market data, order management, portfolio, and funds. Configuration only - no runtime backend integration yet.",
    color: "bg-pink-500",
    textColor: "text-pink-400",
    capabilities: ["Market Data", "Orders", "Portfolio", "Funds"],
    fields: [
      {
        key: "user_id",
        label: "User ID",
        placeholder: "Enter Alice Blue User ID",
        hint: "Your Alice Blue client user ID",
        required: true,
        sensitive: false,
      },
      {
        key: "api_key",
        label: "API Key",
        placeholder: "Enter Alice Blue API Key",
        hint: "From Alice Blue ANT portal - API Keys",
        required: true,
        sensitive: true,
      },
    ],
    docsUrl: "https://ant.aliceblueonline.com/developer-guide/",
    runtimeIntegrated: false,
  },
];

export function getBrokerProvider(brokerId: string): BrokerProviderDef | undefined {
  return BROKER_PROVIDERS.find((p) => p.id === brokerId);
}
