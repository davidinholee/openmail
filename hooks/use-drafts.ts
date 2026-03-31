"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Draft {
  id: string;
  userId: string;
  to: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  body: string;
  replyToThreadId: string | null;
  status: "draft" | "sent";
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useDrafts() {
  return useQuery<Draft[]>({
    queryKey: ["drafts"],
    queryFn: async () => {
      const res = await fetch("/api/drafts");
      if (!res.ok) throw new Error("Failed to fetch drafts");
      return res.json();
    },
  });
}

export function useDraft(id: string) {
  return useQuery<Draft>({
    queryKey: ["draft", id],
    queryFn: async () => {
      const res = await fetch(`/api/drafts/${id}`);
      if (!res.ok) throw new Error("Failed to fetch draft");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (draft?: Partial<Draft>) => {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft || {}),
      });
      if (!res.ok) throw new Error("Failed to create draft");
      return res.json() as Promise<Draft>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: Partial<Draft> & { id: string }) => {
      const res = await fetch(`/api/drafts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update draft");
      return res.json() as Promise<Draft>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["draft", variables.id] });
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete draft");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });
}

export function useSendDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/drafts/${id}/send`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });
}
