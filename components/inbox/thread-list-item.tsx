"use client";

import { cn } from "@/lib/utils";
import { Star, Paperclip } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { EmailThread } from "@/types/email";

interface ThreadListItemProps {
  thread: EmailThread;
  isSelected: boolean;
  onClick: () => void;
}

export function ThreadListItem({
  thread,
  isSelected,
  onClick,
}: ThreadListItemProps) {
  const initial = (thread.from.name || thread.from.email || "?")[0].toUpperCase();

  const timeAgo = thread.lastMessageDate
    ? formatDistanceToNow(new Date(thread.lastMessageDate), {
        addSuffix: false,
      })
    : "";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-4 px-5 py-4 text-left transition-all duration-150 border-b border-border/60 group",
        isSelected
          ? "bg-secondary/80"
          : "hover:bg-secondary/40",
      )}
    >
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium mt-0.5",
        thread.isUnread
          ? "bg-foreground text-background"
          : "bg-secondary text-muted-foreground"
      )}>
        {initial}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "truncate text-[13px]",
              thread.isUnread ? "font-semibold" : "font-normal"
            )}
          >
            {thread.from.name || thread.from.email}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {thread.isStarred && (
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            )}
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {timeAgo}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-[13px]",
              thread.isUnread
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            {thread.subject}
          </span>
          {thread.messageCount > 1 && (
            <span className="shrink-0 text-[11px] text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5 tabular-nums">
              {thread.messageCount}
            </span>
          )}
        </div>

        <p className="truncate text-[12px] text-muted-foreground/70 leading-relaxed">
          {thread.snippet}
        </p>
      </div>

      {(thread.hasAttachments || thread.isUnread) && (
        <div className="flex flex-col items-center gap-2 pt-1 shrink-0">
          {thread.hasAttachments && (
            <Paperclip className="h-3 w-3 text-muted-foreground/60" />
          )}
          {thread.isUnread && (
            <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
          )}
        </div>
      )}
    </button>
  );
}
