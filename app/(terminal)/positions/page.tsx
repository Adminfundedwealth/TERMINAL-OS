import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PositionsListClient } from "@/components/positions/positions-list-client";

export const metadata: Metadata = { title: "Positions" };

export default function PositionsPage() {
  return (
    <div>
      <PageHeader title="Positions" description="All open and closed positions across accounts" />
      <PositionsListClient />
    </div>
  );
}
