import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { JournalClient } from "@/components/user-data/journal-client";

export const metadata: Metadata = { title: "Journal" };

export default function JournalPage() {
  return (
    <div>
      <PageHeader
        title="Journal"
        description="Trader journal entries — read-only admin view, data isolation enforced"
      />
      <JournalClient />
    </div>
  );
}
