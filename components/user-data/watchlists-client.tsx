"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { Search, RefreshCw } from "lucide-react";

async function fetchWatchlists(params: URLSearchParams) {
  const res = await fetch(`/api/terminal/watchlists?${params}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export function WatchlistsClient() {
  const [userId, setUserId] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  params.set("page", String(page));

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["watchlists", userId, page],
    queryFn: () => fetchWatchlists(params),
  });

  const watchlists = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Filter by User ID…" value={userId}
            onChange={(e) => { setUserId(e.target.value); setPage(1); }}
            className="pl-8 h-8 text-sm" />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <DataTable
        columns={[
          { key: "id", header: "ID", render: (r) => <span className="font-mono text-xs text-muted-foreground">{String(r.id).slice(0, 8)}…</span> },
          { key: "owner_user_id", header: "Owner", render: (r) => <span className="font-mono text-xs">{String(r.owner_user_id).slice(0, 10)}…</span> },
          { key: "name", header: "Watchlist", render: (r) => <span className="font-medium">{String(r.name)}</span> },
          {
            key: "items",
            header: "Symbols",
            render: (r) => {
              const items = Array.isArray(r.watchlist_items) ? r.watchlist_items as Record<string, unknown>[] : [];
              return <span className="text-xs text-muted-foreground">{items.map((i) => String(i.symbol)).join(", ") || "—"}</span>;
            },
          },
          { key: "created_at", header: "Created", render: (r) => <span className="text-xs text-muted-foreground">{formatRelativeTime(String(r.created_at))}</span> },
          { key: "updated_at", header: "Updated", render: (r) => <span className="text-xs text-muted-foreground">{formatRelativeTime(String(r.updated_at))}</span> },
        ]}
        data={watchlists}
        loading={isLoading}
        keyField="id"
        emptyTitle="No watchlists found"
        emptyDescription="User watchlists will appear here once traders create them."
        total={total}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
