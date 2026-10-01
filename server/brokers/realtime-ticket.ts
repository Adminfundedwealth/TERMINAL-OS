import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const REALTIME_TICKET_TTL_SECONDS = 90;

const TicketPayloadSchema = z.object({
  iss: z.literal("terminal-os"),
  sub: z.string().uuid(),
  account_id: z.string().uuid(),
  provider: z.enum(["dhan", "kite"]),
  environment: z.enum(["production", "paper", "sandbox"]),
  jti: z.string().uuid(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
}).strict();

export type RealtimeTicketClaims = z.infer<typeof TicketPayloadSchema>;

function signature(input: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(input).digest();
}

function assertSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("Realtime ticket signing secret must be at least 32 bytes.");
  }
}

export function encodeRealtimeTicket(claims: RealtimeTicketClaims, secret: string): string {
  assertSecret(secret);
  const validatedClaims = TicketPayloadSchema.parse(claims);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(validatedClaims)).toString("base64url");
  const signingInput = `${header}.${payload}`;
  return `${signingInput}.${signature(signingInput, secret).toString("base64url")}`;
}

export function issueRealtimeTicket(
  scope: Pick<RealtimeTicketClaims, "sub" | "account_id" | "provider" | "environment">,
  secret: string,
  now = Date.now(),
): { ticket: string; claims: RealtimeTicketClaims } {
  assertSecret(secret);
  const issuedAt = Math.floor(now / 1000);
  const claims = TicketPayloadSchema.parse({
    iss: "terminal-os",
    ...scope,
    jti: randomUUID(),
    iat: issuedAt,
    exp: issuedAt + REALTIME_TICKET_TTL_SECONDS,
  });
  return { ticket: encodeRealtimeTicket(claims, secret), claims };
}

export function verifyRealtimeTicket(
  ticket: string,
  secret: string,
  options: { now?: number; allowExpired?: boolean } = {},
): RealtimeTicketClaims {
  assertSecret(secret);
  const parts = ticket.split(".");
  if (parts.length !== 3) throw new Error("Invalid realtime ticket.");
  const [header, payload, encodedSignature] = parts;
  const signingInput = `${header}.${payload}`;
  let parsedHeader: unknown;
  let parsedPayload: unknown;
  let suppliedSignature: Buffer;
  try {
    parsedHeader = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
    parsedPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    suppliedSignature = Buffer.from(encodedSignature, "base64url");
  } catch {
    throw new Error("Invalid realtime ticket.");
  }
  const expectedSignature = signature(signingInput, secret);
  if (
    !parsedHeader || typeof parsedHeader !== "object" ||
    (parsedHeader as Record<string, unknown>).alg !== "HS256" ||
    (parsedHeader as Record<string, unknown>).typ !== "JWT" ||
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    throw new Error("Invalid realtime ticket.");
  }

  const claims = TicketPayloadSchema.parse(parsedPayload);
  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1000);
  if (claims.exp <= claims.iat || claims.exp - claims.iat > REALTIME_TICKET_TTL_SECONDS || claims.iat > nowSeconds + 30) {
    throw new Error("Invalid realtime ticket lifetime.");
  }
  if (!options.allowExpired && claims.exp <= nowSeconds) throw new Error("Realtime ticket expired.");
  return claims;
}