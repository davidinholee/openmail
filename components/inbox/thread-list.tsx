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
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <div className="flex-1">
          <SearchBar onSearch={onSearch} />
        </div>
        <button
          onClick={handleRefresh}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading && threads.length === 0 ? (
          <div className="p-5 space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-2.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Inbox className="h-8 w-8 mb-4 opacity-30" />
            <p className="text-sm font-medium">Nothing here</p>
            <p className="text-xs mt-1.5 text-muted-foreground/60">
              Try a different search or check back later
            </p>
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
              <div className="p-6 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLoadMore}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
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
