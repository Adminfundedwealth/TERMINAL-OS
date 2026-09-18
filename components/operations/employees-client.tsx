"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

const ROLES = ["", "SUPER_ADMIN", "ADMIN", "TRADING_OPERATIONS", "RISK_MANAGER", "SUPPORT", "VIEWER"];
const STATUS_OPTIONS = ["", "ACTIVE", "INACTIVE", "SUSPENDED"];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TRADING_OPERATIONS: "Trading Ops",
  RISK_MANAGER: "Risk Manager",
  SUPPORT: "Support",
  VIEWER: "Viewer",
};

async function fetchEmployees(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/employees?${params}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export function EmployeesClient() {
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (status) params.set("status", status);
  params.set("page", String(page));

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["employees", role, status, page],
    queryFn: () => fetchEmployees(params),
  });

  const employees = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <Button key={s} variant={status === s ? "default" : "outline"} size="sm" className="h-7 text-xs"
              onClick={() => { setStatus(s); setPage(1); }}>
              {s || "All Status"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ROLES.map((r) => (
            <Button key={r} variant={role === r ? "default" : "outline"} size="sm" className="h-7 text-xs"
              onClick={() => { setRole(r); setPage(1); }}>
              {r ? ROLE_LABELS[r] ?? r : "All Roles"}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r.id).slice(0, 8)}…</span> },
          { key: "full_name", header: "Name", render: (r) => <span className="font-medium">{String(r.full_name)}</span> },
          { key: "email", header: "Email", render: (r) => <span className="text-xs text-muted-foreground">{String(r.email)}</span> },
          { key: "role", header: "Role", render: (r) => <StatusBadge status={String(r.role)} label={ROLE_LABELS[String(r.role)] ?? String(r.role)} /> },
          { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r.status)} /> },
          { key: "last_login_at", header: "Last Login", render: (r) => (
            <span className="text-xs text-muted-foreground">{r.last_login_at ? formatRelativeTime(String(r.last_login_at)) : "Never"}</span>
          )},
          { key: "created_at", header: "Created", render: (r) => <span className="text-xs text-muted-foreground">{formatDateTime(String(r.created_at))}</span> },
        ]}
        data={employees}
        loading={isLoading}
        keyField="id"
        emptyTitle="No employees found"
        emptyDescription="Employee accounts will appear here once created."
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
