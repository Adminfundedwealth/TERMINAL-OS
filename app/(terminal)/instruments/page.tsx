import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { InstrumentsListClient } from "@/components/instruments/instruments-list-client";
import { getInstrumentStats } from "@/server/services/instruments";
import { ListFilter } from "lucide-react";

export const metadata: Metadata = { title: "Instruments" };
export const revalidate = 300;

export default async function InstrumentsPage() {
  const stats = await getInstrumentStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instruments"
        description="Instrument master data backed by Terminal Supabase #2"
      />
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Instruments" value={String(stats.total)} icon={ListFilter} />
        <StatCard title="Active" value={String(stats.active)} description="Status: ACTIVE" />
        <StatCard title="Exchanges" value={String(stats.exchanges)} description="Unique exchanges" />
      </div>
      <InstrumentsListClient />
    </div>
  );
}
