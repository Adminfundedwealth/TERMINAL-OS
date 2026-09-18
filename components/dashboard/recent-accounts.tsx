import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Users2 } from "lucide-react";

interface RecentAccount {
  id: string;
  account_code: string;
  status: string;
  account_type: string;
  current_balance: number;
  currency: string;
  created_at: string;
}

interface RecentAccountsTableProps {
  accounts: RecentAccount[];
}

export function RecentAccountsTable({ accounts }: RecentAccountsTableProps) {
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Users2}
        title="No accounts yet"
        description="Trading accounts will appear here once created."
      />
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-xs" aria-label="Recent trading accounts">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide">
              Account
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wide">
              Status
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground uppercase tracking-wide">
              Balance
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground uppercase tracking-wide">
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc) => (
            <tr
              key={acc.id}
              className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
            >
              <td className="px-3 py-2.5">
                <Link
                  href={`/trading-accounts/${acc.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {acc.account_code}
                </Link>
                <p className="text-muted-foreground text-[10px] mt-0.5">{acc.account_type}</p>
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={acc.status} />
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {formatCurrency(acc.current_balance, acc.currency)}
              </td>
              <td className="px-3 py-2.5 text-right text-muted-foreground">
                {formatRelativeTime(acc.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
