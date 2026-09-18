import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ProvidersClient } from "@/components/providers/providers-client";

export const metadata: Metadata = { title: "Providers" };

export default function ProvidersPage() {
  return (
    <div>
      <PageHeader
        title="Providers"
        description="Operational status of connected data and execution providers — no credentials are displayed"
      />
      <ProvidersClient />
    </div>
  );
}
