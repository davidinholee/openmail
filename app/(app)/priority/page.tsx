"use client";

import { useState, useMemo } from "react";
import { ThreadList } from "@/components/inbox/thread-list";
import { useThreads } from "@/hooks/use-threads";
import { Sparkles } from "lucide-react";

export default function PriorityPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } = useThreads({
    query: searchQuery || undefined,
    priority: true,
  });

  const threads = useMemo(
    () => data?.pages.flatMap((p) => p.threads) ?? [],
    [data]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground tracking-wide">
          Smart AI ranking coming soon
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <ThreadList
          threads={threads}
          isLoading={isLoading}
          hasMore={!!hasNextPage}
          onLoadMore={() => fetchNextPage()}
          onSearch={setSearchQuery}
          onRefresh={() => refetch()}
          basePath="/inbox"
        />
      </div>
    </div>
  );
}
