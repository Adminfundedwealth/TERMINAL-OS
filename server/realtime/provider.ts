import type { RealtimeTicketClaims } from "../brokers/realtime-ticket";
import type { RealtimeServerMessage } from "../brokers/realtime-contract";

export type AuthorizedRealtimeScope = RealtimeTicketClaims & { authorizedAt: number };

export interface ProviderSubscription {
  providerInstrumentId: string;
  symbol: string;
  exchange: string;
  segment: string;
}

export interface RealtimeProvider {
  validateInstrument(instrument: ProviderSubscription): boolean;
  subscribe(scope: AuthorizedRealtimeScope, instrument: ProviderSubscription, credentials: Record<string, string>, emit: (event: RealtimeServerMessage) => void): Promise<() => void>;
}

export interface ProviderRegistry {
  get(provider: "dhan" | "kite", environment: "production" | "paper" | "sandbox"): RealtimeProvider;
}

export class MockRealtimeProvider implements RealtimeProvider {
  validateInstrument(instrument: ProviderSubscription): boolean {
    return /^\d+$/.test(instrument.providerInstrumentId) && Boolean(instrument.symbol.trim() && instrument.exchange.trim() && instrument.segment.trim());
  }

  async subscribe(scope: AuthorizedRealtimeScope, instrument: ProviderSubscription, _credentials: Record<string, string>, emit: (event: RealtimeServerMessage) => void): Promise<() => void> {
    const timer = setInterval(() => {
      emit({
        type: instrument.segment === "IDX_I" ? "index" : "quote",
        provider: scope.provider,
        account_id: scope.account_id,
        instrument,
        timestamp: new Date().toISOString(),
        ltp: 100,
        change: 0,
        change_percent: 0,
        bid: null,
        ask: null,
        volume: 0,
      });
    }, 1000);
    return () => clearInterval(timer);
  }
}

export class MockProviderRegistry implements ProviderRegistry {
  private readonly provider = new MockRealtimeProvider();
  get(): RealtimeProvider { return this.provider; }
}