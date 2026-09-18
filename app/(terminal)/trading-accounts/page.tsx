import { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AccountsListClient } from "@/components/accounts/accounts-list-client";

export const metadata: Metadata = { title: "Trading Accounts" };

export default function TradingAccountsPage() {
  return (
    <div>
      <PageHeader
        title="Trading Accounts"
        description="All trading accounts on Terminal Supabase #2"
      />
      <AccountsListClient />
    </div>
  );
}
