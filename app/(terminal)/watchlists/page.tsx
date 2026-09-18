import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { WatchlistsClient } from "@/components/user-data/watchlists-client";

export const metadata: Metadata = { title: "Watchlists" };

export default function WatchlistsPage() {
  return (
    <div>
      <PageHeader title="Watchlists" description="User watchlists — admin view only, data isolation enforced" />
      <WatchlistsClient />
    </div>
  );
}
