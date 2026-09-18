/**
 * Broker API Keys — domain types for Terminal Admin OS
 */

// -------------------------------------------------------
// BROKER IDs
// -------------------------------------------------------

export type BrokerId =
  | "dhan"
  | "zerodha"
  | "angel_one"
  | "upstox"
  | "fivepaisa"
  | "fyers"
  | "alice_blue";

// -------------------------------------------------------
// CREDENTIAL FIELD DEFINITIONS
// -------------------------------------------------------

export interface CredentialField {
  key: string;          // maps to the stored credential map key
  label: string;        // display label
  placeholder: string;
  hint?: string;        // helper text shown below the field
  required: boolean;
  sensitive: boolean;   // whether to mask/toggle visibility
}

// -------------------------------------------------------
// PROVIDER DEFINITION (static metadata — never from DB)
// -------------------------------------------------------

export interface BrokerProviderDef {
  id: BrokerId;
  name: string;
  description: string;
  color: string;         // tailwind bg colour class for the avatar dot
  textColor: string;     // tailwind text colour class
  capabilities: string[];
  fields: CredentialField[];
  docsUrl: string;
  /** Only Dhan has a real backend runtime integration */
  runtimeIntegrated: boolean;
  /** Dhan upstream REST base */
  apiBase?: string;
  /** Dhan WebSocket */
  wsBase?: string;
}

// -------------------------------------------------------
// DATABASE ROW  (what comes back from broker_credentials)
// -------------------------------------------------------

export interface BrokerCredentialRow {
  id: string;
  broker_id: BrokerId;
  label: string;
  /** Masked credential values — NEVER the raw secrets */
  masked_credentials: Record<string, string>;
  is_active: boolean;
  is_connected: boolean;
  last_tested_at: string | null;
  last_test_result: string | null;
  environment: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------
// API PAYLOADS
// -------------------------------------------------------

export interface SaveBrokerCredentialsPayload {
  broker_id: BrokerId;
  label?: string;
  credentials: Record<string, string>;  // raw — sent over HTTPS, never stored in browser
  environment?: string;
}

export interface UpdateBrokerCredentialsPayload {
  label?: string;
  credentials?: Record<string, string>;
  environment?: string;
}

// -------------------------------------------------------
// CONNECTION TEST RESULT
// -------------------------------------------------------

export interface ConnectionTestResult {
  success: boolean;
  broker_id: BrokerId;
  message: string;
  tested_at: string;
  implemented: boolean; // false = runtime integration not yet available
}
