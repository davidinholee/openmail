"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ModifyOptions {
  messageId: string;
  threadId: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

export function useGmailModify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: ModifyOptions) => {
      const res = await fetch("/api/gmail/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      if (!res.ok) throw new Error("Failed to modify message");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      queryClient.invalidateQueries({ queryKey: ["thread"] });
    },
  });
}

export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft: {
      to: string;
      subject: string;
      body: string;
    }) => {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("Failed to save draft");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });
}
