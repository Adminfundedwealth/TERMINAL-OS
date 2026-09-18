import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityLogClient } from "@/components/operations/activity-log-client";

export const metadata: Metadata = { title: "Activity Log" };

export default function ActivityPage() {
  return (
    <div>
      <PageHeader
        title="Activity Log"
        description="Append-only record of all employee and system operations"
      />
      <ActivityLogClient />
    </div>
  );
}
