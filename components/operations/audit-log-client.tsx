"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { Search, RefreshCw, ShieldCheck } from "lucide-react";

async function fetchAudit(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/audit?${params}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export function AuditLogClient() {
  const [employeeId, setEmployeeId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (employeeId) params.set("employee_id", employeeId);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  params.set("page", String(page));
  params.set("page_size", "50");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["audit", employeeId, dateFrom, dateTo, page],
    queryFn: () => fetchAudit(params),
  });

  const logs = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      {/* Security notice */}
      <div className="flex items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        Audit records are append-only and cannot be deleted by ordinary employees.
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Employee ID…" value={employeeId}
            onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-8 text-sm w-36" aria-label="From" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-8 text-sm w-36" aria-label="To" />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "timestamp", header: "Time", render: (r) => <span className="text-xs tabular-nums">{formatDateTime(String(r.timestamp))}</span> },
          { key: "employee_id", header: "Employee", render: (r) => <span className="font-mono text-xs">{r.employee_id ? String(r.employee_id).slice(0, 8) + "…" : "SYSTEM"}</span> },
          { key: "action", header: "Action", render: (r) => <span className="font-semibold text-xs">{String(r.action)}</span> },
          { key: "module", header: "Module", render: (r) => <span className="text-xs text-muted-foreground">{String(r.module)}</span> },
          { key: "resource", header: "Resource", render: (r) => <span className="text-xs text-muted-foreground">{r.resource ? String(r.resource) : "—"}</span> },
          { key: "resource_id", header: "Resource ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.resource_id ? String(r.resource_id).slice(0, 10) + "…" : "—"}</span> },
          { key: "result", header: "Result", render: (r) => (
            <span className={`text-xs font-medium ${String(r.result) === "SUCCESS" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {String(r.result)}
            </span>
          )},
          { key: "ip_address", header: "IP", render: (r) => <span className="text-xs font-mono text-muted-foreground">{r.ip_address ? String(r.ip_address) : "—"}</span> },
        ]}
        data={logs}
        loading={isLoading}
        keyField="id"
        emptyTitle="No audit records found"
        emptyDescription="Security-sensitive operations will be recorded here."
        total={total}
        page={page}
        pageSize={50}
        onPageChange={setPage}
      />
    </div>
  );
}
