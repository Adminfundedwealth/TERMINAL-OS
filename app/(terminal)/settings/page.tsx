import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsClient } from "@/components/operations/settings-client";
import { getSettings } from "@/server/services/operations";

export const metadata: Metadata = { title: "Terminal Settings" };

export default async function SettingsPage() {
  const settings = await getSettings();

  // Group by category
  const grouped = settings.reduce<Record<string, typeof settings>>(
    (acc, s) => {
      acc[s.category] = acc[s.category] ?? [];
      acc[s.category].push(s);
      return acc;
    },
    {}
  );

  return (
    <div>
      <PageHeader
        title="Terminal Settings"
        description="Operational settings — sensitive provider credentials are server-side only"
      />
      <SettingsClient groupedSettings={grouped} />
    </div>
  );
}
