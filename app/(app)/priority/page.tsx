"use client";

import { useState, useMemo } from "react";
import { ThreadList } from "@/components/inbox/thread-list";
import { useThreads } from "@/hooks/use-threads";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function PriorityPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } = useThreads({
    query: searchQuery ? `is:important ${searchQuery}` : "is:important",
    labelIds: ["INBOX"],
  });

  const threads = useMemo(
    () => data?.pages.flatMap((p) => p.threads) ?? [],
    [data]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <Badge variant="secondary" className="text-xs gap-1">
          <Sparkles className="h-3 w-3" />
          Smart ranking coming soon
        </Badge>
      </div>
      <div className="flex-1">
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
