import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ExecutionsListClient } from "@/components/executions/executions-list-client";

export const metadata: Metadata = { title: "Executions" };

export default function ExecutionsPage() {
  return (
    <div>
      <PageHeader title="Executions" description="All trade executions across all accounts" />
      <ExecutionsListClient />
    </div>
  );
}
