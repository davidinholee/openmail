"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { ThreadListResponse } from "@/types/email";

export function useThreads(options?: {
  query?: string;
  labelIds?: string[];
  priority?: boolean;
  enabled?: boolean;
}) {
  const { query, labelIds, priority, enabled = true } = options || {};

  return useInfiniteQuery<ThreadListResponse>({
    queryKey: ["threads", query, labelIds, priority],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (labelIds) params.set("labelIds", labelIds.join(","));
      if (priority) params.set("priority", "true");
      if (pageParam) params.set("pageToken", pageParam as string);

      const res = await fetch(`/api/gmail/threads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    enabled,
  });
}
