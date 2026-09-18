"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import type { TradingAccount } from "@/types";
import { Search, RefreshCw } from "lucide-react";

const STATUS_FILTERS = ["", "ACTIVE", "INACTIVE", "SUSPENDED", "BREACHED", "COMPLETED", "EXPIRED"];

async function fetchAccounts(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/accounts?${params}`);
  if (!res.ok) throw new Error("Failed to fetch accounts");
  return res.json();
}

export function AccountsListClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (statusFilter) params.set("status", statusFilter);
  params.set("page", String(page));
  params.set("page_size", "25");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["accounts", search, statusFilter, page],
    queryFn: () => fetchAccounts(params),
    staleTime: 30_000,
  });

  const accounts: TradingAccount[] = data?.data ?? [];
  const total: number = data?.meta?.total ?? 0;

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusFilter(status: string) {
    setStatusFilter(status);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by account code or user ID…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            aria-label="Search trading accounts"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleStatusFilter(s)}
            >
              {s === "" ? "All" : s}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 ml-auto"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <DataTable<Record<string, unknown>>
        columns={[
          {
            key: "account_code",
            header: "Account Code",
            render: (row) => (
              <span className="font-medium text-primary">{String(row.account_code)}</span>
            ),
          },
          {
            key: "owner_user_id",
            header: "Owner ID",
            render: (row) => (
              <span className="text-xs text-muted-foreground font-mono">
                {String(row.owner_user_id).slice(0, 12)}…
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => <StatusBadge status={String(row.status)} />,
          },
          {
            key: "account_type",
            header: "Type",
            render: (row) => (
              <span className="text-xs">{String(row.account_type)}</span>
            ),
          },
          {
            key: "challenge_type",
            header: "Challenge",
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {row.challenge_type ? String(row.challenge_type) : "—"}
              </span>
            ),
          },
          {
            key: "starting_balance",
            header: "Starting Balance",
            className: "text-right tabular-nums",
            render: (row) =>
              formatCurrency(Number(row.starting_balance), String(row.currency ?? "INR")),
          },
          {
            key: "current_balance",
            header: "Balance",
            className: "text-right tabular-nums",
            render: (row) =>
              formatCurrency(Number(row.current_balance), String(row.currency ?? "INR")),
          },
          {
            key: "equity",
            header: "Equity",
            className: "text-right tabular-nums",
            render: (row) =>
              formatCurrency(Number(row.equity), String(row.currency ?? "INR")),
          },
          {
            key: "created_at",
            header: "Created",
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {formatDate(String(row.created_at))}
              </span>
            ),
          },
          {
            key: "last_activity_at",
            header: "Last Activity",
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {row.last_activity_at ? formatRelativeTime(String(row.last_activity_at)) : "—"}
              </span>
            ),
          },
        ]}
        data={accounts as unknown as Record<string, unknown>[]}
        loading={isLoading}
        keyField="id"
        emptyTitle="No trading accounts found"
        emptyDescription="Accounts will appear here once created in the Terminal."
        onRowClick={(row) => router.push(`/trading-accounts/${String(row.id)}`)}
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
