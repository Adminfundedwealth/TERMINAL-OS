import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Activity } from "lucide-react";

export const metadata: Metadata = { title: "Market Data" };

/**
 * Market Data page shows operational info only.
 * Per spec: live ticks are NOT stored in PostgreSQL.
 * This page shows connection status and data freshness from provider_health.
 */
export default function MarketDataPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Data"
        description="Operational market data status — live ticks are not stored in PostgreSQL"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Data Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Activity}
              title="Market data status unavailable"
              description="Connect a real-time market data provider. Live tick data is managed by your market data service and WebSocket infrastructure — not stored in PostgreSQL."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Architecture Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Per design specification, live market tick data is <strong className="text-foreground">not stored in PostgreSQL</strong>.
            </p>
            <p>
              This page surfaces operational metadata only:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Provider connection status → see <strong className="text-foreground">Providers</strong></li>
              <li>WebSocket health → see <strong className="text-foreground">WebSocket</strong></li>
              <li>Instrument master counts → see <strong className="text-foreground">Instruments</strong></li>
            </ul>
            <p className="text-xs pt-2 border-t border-border">
              Missing backend dependency: A real-time market data health endpoint or Redis/WebSocket status
              feed must be implemented in your trading backend before this section can show live data freshness.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
