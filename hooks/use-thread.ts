"use client";

import { useQuery } from "@tanstack/react-query";
import type { EmailThread } from "@/types/email";

export function useThread(threadId: string | undefined) {
  return useQuery<EmailThread>({
    queryKey: ["thread", threadId],
    queryFn: async () => {
      const res = await fetch(`/api/gmail/thread/${threadId}`);
      if (!res.ok) throw new Error("Failed to fetch thread");
      return res.json();
    },
    enabled: !!threadId,
  });
}
