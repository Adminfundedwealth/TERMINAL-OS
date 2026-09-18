import { StatCard } from "@/components/shared/stat-card";
import type { DashboardSummary } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Users2,
  ClipboardList,
  Zap,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Activity,
  CheckCircle2,
} from "lucide-react";

interface DashboardSummaryCardsProps {
  summary: DashboardSummary;
}

export function DashboardSummaryCards({ summary }: DashboardSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Total Accounts"
        value={formatNumber(summary.total_accounts)}
        icon={Users2}
        description="All trading accounts"
      />
      <StatCard
        title="Active Accounts"
        value={formatNumber(summary.active_accounts)}
        icon={CheckCircle2}
        iconClassName="bg-emerald-500/10"
        description="Currently active"
      />
      <StatCard
        title="Orders Today"
        value={formatNumber(summary.orders_today)}
        icon={ClipboardList}
        description="Orders placed today"
      />
      <StatCard
        title="Executions Today"
        value={formatNumber(summary.executions_today)}
        icon={Zap}
        description="Filled today"
      />
      <StatCard
        title="Open Positions"
        value={formatNumber(summary.open_positions)}
        icon={TrendingUp}
        description="Currently open"
      />
      <StatCard
        title="Total Exposure"
        value={formatCurrency(summary.total_exposure)}
        icon={DollarSign}
        description="Open position value"
      />
      <StatCard
        title="Risk Events Today"
        value={formatNumber(summary.risk_events_today)}
        icon={AlertTriangle}
        iconClassName={summary.risk_events_today > 0 ? "bg-amber-500/10" : undefined}
        description="Risk alerts today"
      />
      <StatCard
        title="System"
        value={summary.system_health.database === "HEALTHY" ? "Online" : "Degraded"}
        icon={Activity}
        iconClassName={
          summary.system_health.database === "HEALTHY"
            ? "bg-emerald-500/10"
            : "bg-red-500/10"
        }
        description="Database health"
      />
    </div>
  );
}
