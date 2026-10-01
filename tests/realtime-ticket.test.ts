import { describe, expect, it } from "vitest";
import { issueRealtimeTicket, verifyRealtimeTicket } from "../server/brokers/realtime-ticket";

const secret = "local-test-secret-that-is-long-enough-for-hmac";
const scope = {
  sub: "11111111-1111-4111-8111-111111111111",
  account_id: "22222222-2222-4222-8222-222222222222",
  provider: "dhan" as const,
  environment: "paper" as const,
};
const now = Date.parse("2026-10-01T10:00:00.000Z");

describe("realtime ticket", () => {
  it("issues a short-lived ticket with only customer/account scope", () => {
    const { ticket, claims } = issueRealtimeTicket(scope, secret, now);
    expect(verifyRealtimeTicket(ticket, secret, { now })).toEqual(claims);
    expect(claims).toMatchObject({ ...scope, exp: claims.iat + 90 });
    expect(JSON.stringify(claims)).not.toMatch(/credential|access_token|api_key/i);
  });

  it("rejects tampered tickets and invalid signing secrets", () => {
    const { ticket } = issueRealtimeTicket(scope, secret, now);
    expect(() => verifyRealtimeTicket(`${ticket.slice(0, -1)}x`, secret, { now })).toThrow("Invalid realtime ticket");
    expect(() => issueRealtimeTicket(scope, "too-short", now)).toThrow("at least 32 bytes");
  });

  it("rejects expired tickets and tickets containing undeclared fields", () => {
    const { ticket } = issueRealtimeTicket(scope, secret, now);
    expect(() => verifyRealtimeTicket(ticket, secret, { now: now + 91_000 })).toThrow("expired");

    const parts = ticket.split(".");
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    payload.access_token = "must-not-be-present";
    const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
    expect(() => verifyRealtimeTicket(`${parts[0]}.${payloadPart}.${parts[2]}`, secret, { now })).toThrow();
  });

  it("can verify a previously issued ticket for internal reauthorization after expiry", () => {
    const { ticket } = issueRealtimeTicket(scope, secret, now);
    expect(verifyRealtimeTicket(ticket, secret, { now: now + 91_000, allowExpired: true })).toMatchObject(scope);
  });
});