"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

interface SyncResponse {
  type: "full" | "incremental" | "skipped";
  threadsUpdated: number;
  threadsRemoved: number;
  complete: boolean;
  durationMs: number;
  progress?: {
    threadsProcessed: number;
    pagesProcessed: number;
  };
}

export function useSync() {
  const queryClient = useQueryClient();
  const pollingRef = useRef(false);

  const mutation = useMutation({
    mutationFn: async (options?: { force?: boolean }): Promise<SyncResponse> => {
      const url = `/api/sync${options?.force ? "?force=full" : ""}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      // Always invalidate to show new threads as they arrive
      queryClient.invalidateQueries({ queryKey: ["threads"] });

      // If sync is not complete, trigger next chunk
      if (!data.complete && !pollingRef.current) {
        pollingRef.current = true;
        setTimeout(() => {
          pollingRef.current = false;
          mutation.mutate({}); // No force flag — resumes via cursor
        }, 1000);
      }
    },
  });

  return mutation;
}

export function useSyncOnMount() {
  const sync = useSync();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!hasSynced.current) {
      hasSynced.current = true;
      sync.mutate({});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return sync;
}
