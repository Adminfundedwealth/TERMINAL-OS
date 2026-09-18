import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AuditLogClient } from "@/components/operations/audit-log-client";

export const metadata: Metadata = { title: "Audit Log" };

export default function AuditPage() {
  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Security-sensitive operations — cannot be deleted by ordinary employees"
      />
      <AuditLogClient />
    </div>
  );
}
