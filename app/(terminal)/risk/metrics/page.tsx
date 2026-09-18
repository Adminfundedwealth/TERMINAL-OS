import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { RiskMetricsTable } from "@/components/risk/risk-metrics-table";

export const metadata: Metadata = { title: "Account Metrics" };

export default function AccountMetricsPage() {
  return (
    <div>
      <PageHeader
        title="Account Metrics"
        description="Latest risk metric snapshots per account from the risk service"
      />
      <RiskMetricsTable />
    </div>
  );
}
