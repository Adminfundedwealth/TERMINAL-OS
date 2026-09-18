import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SystemHealthClient } from "@/components/operations/system-health-client";

export const metadata: Metadata = { title: "System Health" };

export default function SystemHealthPage() {
  return (
    <div>
      <PageHeader
        title="System Health"
        description="Real-time health checks across all Terminal OS services"
      />
      <SystemHealthClient />
    </div>
  );
}
