"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "./search-bar";
import { ThreadListItem } from "./thread-list-item";
import { Button } from "@/components/ui/button";
import { RefreshCw, Inbox } from "lucide-react";
import type { EmailThread } from "@/types/email";

interface ThreadListProps {
  threads: EmailThread[];
  isLoading: boolean;
  selectedThreadId?: string;
  hasMore: boolean;
  onLoadMore: () => void;
  onSearch: (query: string) => void;
  onRefresh: () => void;
  basePath?: string;
}

export function ThreadList({
  threads,
  isLoading,
  selectedThreadId,
  hasMore,
  onLoadMore,
  onSearch,
  onRefresh,
  basePath = "/inbox",
}: ThreadListProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <div className="flex-1">
          <SearchBar onSearch={onSearch} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="h-9 w-9 shrink-0"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && threads.length === 0 ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No emails found</p>
            <p className="text-xs mt-1">Try a different search or check back later</p>
          </div>
        ) : (
          <div>
            {threads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                isSelected={thread.id === selectedThreadId}
                onClick={() => router.push(`${basePath}/${thread.id}`)}
              />
            ))}
            {hasMore && (
              <div className="p-4 text-center">
                <Button variant="ghost" size="sm" onClick={onLoadMore}>
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
