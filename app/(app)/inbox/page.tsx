"use client";

import { useState, useMemo } from "react";
import { ThreadList } from "@/components/inbox/thread-list";
import { useThreads } from "@/hooks/use-threads";

export default function InboxPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, fetchNextPage, hasNextPage, refetch } = useThreads({
    query: searchQuery || undefined,
    labelIds: ["INBOX"],
  });

  const threads = useMemo(
    () => data?.pages.flatMap((p) => p.threads) ?? [],
    [data]
  );

  return (
    <ThreadList
      threads={threads}
      isLoading={isLoading}
      hasMore={!!hasNextPage}
      onLoadMore={() => fetchNextPage()}
      onSearch={setSearchQuery}
      onRefresh={() => refetch()}
      basePath="/inbox"
    />
  );
}
