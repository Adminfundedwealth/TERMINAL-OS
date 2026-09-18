import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAccountById, getAccountSummaryStats } from "@/server/services/accounts";
import { getAuthenticatedEmployee } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { AccountOrdersTab } from "@/components/accounts/account-orders-tab";
import { AccountPositionsTab } from "@/components/accounts/account-positions-tab";
import { AccountRiskTab } from "@/components/accounts/account-risk-tab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDateTime, formatPercent } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const account = await getAccountById(id);
  return {
    title: account ? `Account ${account.account_code}` : "Account Not Found",
  };
}

export default async function AccountDetailPage({ params }: PageProps) {
  const employee = await getAuthenticatedEmployee();
  if (!employee) redirect("/login");

  const { id } = await params;
  const [account, stats] = await Promise.all([
    getAccountById(id),
    getAccountSummaryStats(id),
  ]);

  if (!account) notFound();

  // latest_metrics comes from account_metrics (daily EOD row)
  const metrics = stats.latest_metrics as {
    realized_pnl: number;
    unrealized_pnl: number;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    daily_loss: number;
    starting_balance: number;
    ending_balance: number;
    peak_balance: number;
  } | null;

  // Drawdown from metrics: (peak - ending) / peak
  const drawdownPct =
    metrics && metrics.peak_balance > 0
      ? ((metrics.peak_balance - metrics.ending_balance) / metrics.peak_balance) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/trading-accounts" className="hover:text-foreground transition-colors">
          Trading Accounts
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{account.account_code}</span>
      </nav>

      <PageHeader
        title={account.account_code}
        description={`Trader: ${account.trader_id}`}
        actions={<StatusBadge status={account.status} />}
      />

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Balance"
          value={formatCurrency(account.balance)}
        />
        <StatCard
          title="Available Margin"
          value={formatCurrency(account.available_margin)}
        />
        <StatCard
          title="Used Margin"
          value={formatCurrency(account.used_margin)}
        />
        <StatCard
          title="Current Drawdown"
          value={formatPercent(drawdownPct)}
        />
        <StatCard
          title="Open Positions"
          value={String(stats.open_positions.length)}
        />
        <StatCard
          title="Closed Positions"
          value={String(stats.closed_positions_count)}
        />
        <StatCard
          title="Orders Today"
          value={String(stats.orders_today)}
        />
        <StatCard
          title="Today Realized P&L"
          value={metrics ? formatCurrency(metrics.realized_pnl) : "—"}
        />
      </div>

      {/* Account metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["Account ID", <span key="aid" className="font-mono text-xs">{account.id}</span>],
              ["Account Code", account.account_code],
              ["Trader ID", <span key="tid" className="font-mono text-xs">{account.trader_id}</span>],
              ["Challenge ID", account.challenge_id ? <span key="cid" className="font-mono text-xs">{account.challenge_id}</span> : "—"],
              ["Broker", account.broker_provider],
              ["Broker Client ID", account.broker_client_id],
              ["Status", <StatusBadge key="status" status={account.status} />],
              ["Locked Reason", account.locked_reason ?? "—"],
              ["Locked At", account.locked_at ? formatDateTime(account.locked_at) : "—"],
              ["Created", formatDateTime(account.created_at)],
              ["Updated", formatDateTime(account.updated_at)],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground shrink-0">{label}</span>
                <span className="text-right font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Today&apos;s Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {metrics ? (
              [
                ["Starting Balance", formatCurrency(metrics.starting_balance)],
                ["Ending Balance", formatCurrency(metrics.ending_balance)],
                ["Peak Balance", formatCurrency(metrics.peak_balance)],
                ["Realized P&L", formatCurrency(metrics.realized_pnl)],
                ["Unrealized P&L", formatCurrency(metrics.unrealized_pnl)],
                ["Daily Loss", formatCurrency(metrics.daily_loss)],
                ["Total Trades", String(metrics.total_trades)],
                ["Winning Trades", String(metrics.winning_trades)],
                ["Losing Trades", String(metrics.losing_trades)],
                ["Drawdown %", formatPercent(drawdownPct)],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No metrics available for today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Sub-tables */}
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold mb-3">Open Positions</h2>
          <AccountPositionsTab accountId={account.id} />
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-3">Recent Orders</h2>
          <AccountOrdersTab accountId={account.id} />
        </div>
        <div>
          <h2 className="text-sm font-semibold mb-3">Risk Events</h2>
          <AccountRiskTab accountId={account.id} />
        </div>
      </div>
    </div>
  );
}
