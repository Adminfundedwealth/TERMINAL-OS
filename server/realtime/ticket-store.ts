export interface OneTimeTicketStore {
  consume(ticketId: string, expiresAtSeconds: number, nowSeconds: number): Promise<boolean>;
}

export class MemoryTicketStore implements OneTimeTicketStore {
  private readonly consumed = new Map<string, number>();

  async consume(ticketId: string, expiresAtSeconds: number, nowSeconds: number): Promise<boolean> {
    for (const [id, expiresAt] of this.consumed) {
      if (expiresAt <= nowSeconds) this.consumed.delete(id);
    }
    if (this.consumed.has(ticketId)) return false;
    this.consumed.set(ticketId, expiresAtSeconds);
    return true;
  }
}

export class RedisTicketStore implements OneTimeTicketStore {
  constructor(private readonly redis: { set(key: string, value: string, options: { NX: true; EX: number }): Promise<string | null> }) {}

  async consume(ticketId: string, expiresAtSeconds: number, nowSeconds: number): Promise<boolean> {
    const ttl = Math.max(1, expiresAtSeconds - nowSeconds);
    return (await this.redis.set(`realtime-ticket:${ticketId}`, "1", { NX: true, EX: ttl })) === "OK";
  }
}