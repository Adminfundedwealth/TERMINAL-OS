import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Radio } from "lucide-react";

export const metadata: Metadata = { title: "WebSocket" };

/**
 * WebSocket operational status page.
 * Real-time WS stats (connected clients, messages/sec, latency) require
 * a backend WebSocket service health endpoint — not yet implemented.
 * Per spec: never expose upstream WS credentials.
 */
export default function WebSocketPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="WebSocket"
        description="WebSocket connection operational status — upstream credentials are never exposed"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-4 w-4" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Radio}
              title="WebSocket service status unavailable"
              description="A WebSocket health API endpoint must be implemented in your trading backend to report connection status, client counts, message rates, and latency here."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Expected Metrics</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>When the WebSocket service health endpoint is available, this section will show:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Connection status (CONNECTED / DISCONNECTED)</li>
              <li>Connected clients count</li>
              <li>Upstream connection health</li>
              <li>Messages per second</li>
              <li>Last message timestamp</li>
              <li>Latency (ms)</li>
              <li>Error count / reconnect count</li>
            </ul>
            <p className="text-xs pt-2 border-t border-border text-amber-600 dark:text-amber-400">
              Missing backend dependency: WebSocket service health API endpoint.
              Upstream credentials remain server-side — never exposed here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
