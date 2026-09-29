"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { hasPermission, PERMISSIONS } from "@/lib/rbac/permissions";
import type { EmployeeRole } from "@/types";
import {
  LayoutDashboard,
  Users2,
  ClipboardList,
  Zap,
  TrendingUp,
  ShieldAlert,
  AlertTriangle,
  BarChart3,
  Gauge,
  ListFilter,
  Activity,
  Radio,
  Server,
  BookOpen,
  Bell,
  FileText,
  History,
  ClipboardCheck,
  UserCog,
  KeyRound,
  Settings,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        permission: PERMISSIONS.DASHBOARD_VIEW,
      },
    ],
  },
  {
    title: "Trading",
    items: [
      {
        label: "Trading Accounts",
        href: "/trading-accounts",
        icon: Users2,
        permission: PERMISSIONS.ACCOUNTS_VIEW,
      },
      {
        label: "Orders",
        href: "/orders",
        icon: ClipboardList,
        permission: PERMISSIONS.ORDERS_VIEW,
      },
      {
        label: "Executions",
        href: "/executions",
        icon: Zap,
        permission: PERMISSIONS.EXECUTIONS_VIEW,
      },
      {
        label: "Positions",
        href: "/positions",
        icon: TrendingUp,
        permission: PERMISSIONS.POSITIONS_VIEW,
      },
    ],
  },
  {
    title: "Risk",
    items: [
      {
        label: "Risk Management",
        href: "/risk",
        icon: ShieldAlert,
        permission: PERMISSIONS.RISK_VIEW,
      },
      {
        label: "Risk Events",
        href: "/risk/events",
        icon: AlertTriangle,
        permission: PERMISSIONS.RISK_EVENTS_VIEW,
      },
      {
        label: "Account Metrics",
        href: "/risk/metrics",
        icon: Gauge,
        permission: PERMISSIONS.RISK_VIEW,
      },
      {
        label: "Rule Management",
        href: "/rules",
        icon: ShieldAlert,
        permission: PERMISSIONS.RISK_INTERVENE,
      },
      {
        label: "Daily Performance",
        href: "/performance",
        icon: BarChart3,
        permission: PERMISSIONS.PERFORMANCE_VIEW,
      },
    ],
  },
  {
    title: "Market",
    items: [
      {
        label: "Instruments",
        href: "/instruments",
        icon: ListFilter,
        permission: PERMISSIONS.INSTRUMENTS_VIEW,
      },
      {
        label: "Market Data",
        href: "/market-data",
        icon: Activity,
        permission: PERMISSIONS.MARKET_DATA_VIEW,
      },
      {
        label: "Providers",
        href: "/providers",
        icon: Server,
        permission: PERMISSIONS.PROVIDERS_VIEW,
      },
      {
        label: "WebSocket",
        href: "/websocket",
        icon: Radio,
        permission: PERMISSIONS.WEBSOCKET_VIEW,
      },
    ],
  },
  {
    title: "User Data",
    items: [
      {
        label: "Watchlists",
        href: "/watchlists",
        icon: BookOpen,
        permission: PERMISSIONS.WATCHLISTS_VIEW,
      },
      {
        label: "Alerts",
        href: "/alerts",
        icon: Bell,
        permission: PERMISSIONS.ALERTS_VIEW,
      },
      {
        label: "Journal",
        href: "/journal",
        icon: FileText,
        permission: PERMISSIONS.JOURNAL_VIEW,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Activity Log",
        href: "/activity",
        icon: History,
        permission: PERMISSIONS.ACTIVITY_VIEW,
      },
      {
        label: "System Health",
        href: "/system-health",
        icon: Server,
        permission: PERMISSIONS.SYSTEM_HEALTH_VIEW,
      },
      {
        label: "Audit Log",
        href: "/audit",
        icon: ClipboardCheck,
        permission: PERMISSIONS.AUDIT_VIEW,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Broker API Keys",
        href: "/broker",
        icon: CreditCard,
        permission: PERMISSIONS.BROKER_VIEW,
      },
      {
        label: "Employees",
        href: "/employees",
        icon: UserCog,
        permission: PERMISSIONS.EMPLOYEES_VIEW,
      },
      {
        label: "Permissions",
        href: "/permissions",
        icon: KeyRound,
        permission: PERMISSIONS.PERMISSIONS_VIEW,
      },
      {
        label: "Terminal Settings",
        href: "/settings",
        icon: Settings,
        permission: PERMISSIONS.SETTINGS_VIEW,
      },
    ],
  },
];

interface SidebarProps {
  employeeRole: EmployeeRole;
}

export function Sidebar({ employeeRole }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-4 border-b border-border shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20 border border-primary/30">
          <BarChart3 className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-xs font-bold text-foreground">FundedWealth</span>
          <span className="text-[10px] text-muted-foreground tracking-widest uppercase">
            Terminal OS
          </span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <nav aria-label="Main navigation">
          {NAV_SECTIONS.map((section, idx) => {
            const visibleItems = section.items.filter((item) =>
              hasPermission(employeeRole, item.permission as Parameters<typeof hasPermission>[1])
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className={cn(idx > 0 && "mt-4")}>
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {idx < NAV_SECTIONS.length - 1 && (
                  <Separator className="mt-3" />
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
