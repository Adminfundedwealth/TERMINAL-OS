import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { RuleManagementClient } from "@/components/rules/rule-management-client";

export const metadata: Metadata = { title: "Rule Management" };

export default function RuleManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Rule Management" description="Canonical products, phases, rule versions, and account assignments" />
      <RuleManagementClient />
    </div>
  );
}