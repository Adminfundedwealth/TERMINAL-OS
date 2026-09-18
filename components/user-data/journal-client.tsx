"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelativeTime, truncate } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";

async function fetchJournal(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/journal?${params}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export function JournalClient() {
  const [accountId, setAccountId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (accountId) params.set("account_id", accountId);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  params.set("page", String(page));

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["journal", accountId, dateFrom, dateTo, page],
    queryFn: () => fetchJournal(params),
  });

  const entries = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Account ID…" value={accountId}
            onChange={(e) => { setAccountId(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="h-8 text-sm w-36" aria-label="From date" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="h-8 text-sm w-36" aria-label="To date" />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "date", header: "Date", render: (r) => <span className="font-medium">{formatDate(String(r.date))}</span> },
          { key: "trading_account_id", header: "Account", render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r.trading_account_id).slice(0, 10)}…</span> },
          { key: "title", header: "Title", render: (r) => <span className="font-medium">{String(r.title)}</span> },
          { key: "entry", header: "Entry", render: (r) => <span className="text-xs text-muted-foreground">{truncate(String(r.entry), 80)}</span> },
          { key: "created_at", header: "Created", render: (r) => <span className="text-xs text-muted-foreground">{formatRelativeTime(String(r.created_at))}</span> },
          { key: "updated_at", header: "Updated", render: (r) => <span className="text-xs text-muted-foreground">{formatRelativeTime(String(r.updated_at))}</span> },
        ]}
        data={entries}
        loading={isLoading}
        keyField="id"
        emptyTitle="No journal entries found"
        emptyDescription="Trader journal entries will appear here once created."
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
