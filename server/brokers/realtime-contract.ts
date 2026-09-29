import { z } from "zod";

const ProviderSchema = z.enum(["dhan", "kite"]);
const EnvironmentSchema = z.enum(["production", "paper", "sandbox"]);
const InstrumentSchema = z.object({
  providerInstrumentId: z.string().min(1).max(64),
  symbol: z.string().min(1).max(64),
  exchange: z.string().min(1).max(16),
  segment: z.string().min(1).max(24),
}).strict();

export const RealtimeClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("connection"),
    action: z.literal("authenticate"),
    ticket: z.string().min(1).max(2048),
    protocol_version: z.literal(1),
  }).strict(),
  z.object({
    type: z.literal("subscription"),
    action: z.enum(["subscribe", "unsubscribe"]),
    request_id: z.string().uuid(),
    account_id: z.string().uuid(),
    provider: ProviderSchema,
    environment: EnvironmentSchema,
    instruments: z.array(InstrumentSchema).min(1).max(500),
  }).strict(),
]);

const ConnectionMessageSchema = z.object({
  type: z.literal("connection"),
  status: z.enum(["authenticated", "ready", "rejected"]),
  connection_id: z.string().uuid().optional(),
  message: z.string().max(160).optional(),
}).strict();

const SubscriptionMessageSchema = z.object({
  type: z.literal("subscription"),
  status: z.enum(["subscribed", "unsubscribed", "rejected"]),
  request_id: z.string().uuid(),
  account_id: z.string().uuid(),
  provider: ProviderSchema,
  environment: EnvironmentSchema,
  instruments: z.array(InstrumentSchema),
  message: z.string().max(160).optional(),
}).strict();

const MarketDataMessageSchema = z.object({
  type: z.enum(["quote", "index"]),
  provider: ProviderSchema,
  account_id: z.string().uuid(),
  instrument: InstrumentSchema,
  timestamp: z.string().datetime(),
  ltp: z.number().finite(),
  change: z.number().finite().nullable(),
  change_percent: z.number().finite().nullable(),
  bid: z.number().finite().nullable(),
  ask: z.number().finite().nullable(),
  volume: z.number().finite().nullable(),
}).strict();

const ErrorMessageSchema = z.object({
  type: z.literal("error"),
  code: z.enum([
    "UNAUTHENTICATED", "ACCOUNT_FORBIDDEN", "ACCOUNT_INACTIVE", "MISSING_CREDENTIALS",
    "INVALID_PROVIDER", "RATE_LIMITED", "PROVIDER_UNAVAILABLE", "INVALID_INSTRUMENT",
  ]),
  message: z.string().max(160),
  request_id: z.string().uuid().optional(),
  retryable: z.boolean(),
}).strict();

const HeartbeatMessageSchema = z.object({
  type: z.literal("heartbeat"),
  timestamp: z.string().datetime(),
}).strict();

const DisconnectMessageSchema = z.object({
  type: z.literal("disconnect"),
  code: z.enum(["NORMAL", "AUTH_EXPIRED", "ACCOUNT_REVOKED", "PROVIDER_DISCONNECTED", "SERVER_SHUTDOWN"]),
  message: z.string().max(160),
  will_retry: z.boolean(),
}).strict();

export const RealtimeServerMessageSchema = z.discriminatedUnion("type", [
  ConnectionMessageSchema,
  SubscriptionMessageSchema,
  MarketDataMessageSchema,
  ErrorMessageSchema,
  HeartbeatMessageSchema,
  DisconnectMessageSchema,
]);

export type RealtimeClientMessage = z.infer<typeof RealtimeClientMessageSchema>;
export type RealtimeServerMessage = z.infer<typeof RealtimeServerMessageSchema>;