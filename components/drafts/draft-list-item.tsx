"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Send, Clock, Reply } from "lucide-react";
import type { Draft } from "@/hooks/use-drafts";

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function DraftListItem({ draft }: { draft: Draft }) {
  const isSent = draft.status === "sent";

  return (
    <Link
      href={`/drafts/${draft.id}`}
      className={cn(
        "flex items-center gap-4 px-5 py-3.5 border-b border-border/40 hover:bg-secondary/40 transition-colors",
        isSent && "opacity-60"
      )}
    >
      <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center">
        {isSent ? (
          <Send className="h-3.5 w-3.5 text-muted-foreground" />
        ) : draft.replyToThreadId ? (
          <Reply className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-baseline gap-3">
          <span className="text-[13px] font-medium truncate flex-1 min-w-0">
            {draft.to || "(no recipient)"}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap shrink-0">
            {timeAgo(draft.updatedAt)}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] truncate">
            {draft.subject || "(no subject)"}
          </span>
          {isSent && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
              Sent
            </span>
          )}
          {!isSent && draft.replyToThreadId && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
              Reply
            </span>
          )}
        </div>
        <p className="text-[12px] text-muted-foreground truncate">
          {draft.body.slice(0, 80) || "(empty)"}
        </p>
      </div>
    </Link>
  );
}
