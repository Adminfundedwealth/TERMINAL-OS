"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Settings } from "lucide-react";
import type { TerminalSetting } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  trading: "Trading",
  risk: "Risk",
  market_data: "Market Data",
  execution: "Execution",
  websocket: "WebSocket",
  notifications: "Notifications",
  security: "Security",
};

interface SettingsClientProps {
  groupedSettings: Record<string, TerminalSetting[]>;
}

export function SettingsClient({ groupedSettings }: SettingsClientProps) {
  const categories = Object.keys(groupedSettings);

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={Settings}
        title="No settings configured"
        description="Terminal settings will appear here once added to the terminal_settings table."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {categories.map((category) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {CATEGORY_LABELS[category] ?? category}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {groupedSettings[category].map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-start justify-between gap-4 text-sm border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{setting.key}</p>
                    {setting.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{setting.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Updated {formatRelativeTime(setting.updated_at)}
                      {setting.updated_by && ` by ${setting.updated_by.slice(0, 8)}…`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                      {typeof setting.value === "object"
                        ? JSON.stringify(setting.value)
                        : String(setting.value)}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
