"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const initials =
    thread.from.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const timeAgo = thread.lastMessageDate
    ? formatDistanceToNow(new Date(thread.lastMessageDate), {
        addSuffix: false,
      })
    : "";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors border-b border-border/50",
        isSelected
          ? "bg-accent"
          : "hover:bg-accent/50",
        thread.isUnread && "bg-accent/30"
      )}
    >
      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
        <AvatarFallback className="text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              thread.isUnread ? "font-semibold" : "font-medium"
            )}
          >
            {thread.from.name || thread.from.email}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {timeAgo}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-sm",
              thread.isUnread
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            )}
          >
            {thread.subject}
          </span>
          {thread.messageCount > 1 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              ({thread.messageCount})
            </span>
          )}
        </div>

        <p className="truncate text-xs text-muted-foreground">
          {thread.snippet}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
        {thread.isStarred && (
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
        )}
        {thread.hasAttachments && (
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {thread.isUnread && (
          <div className="h-2 w-2 rounded-full bg-blue-500" />
        )}
      </div>
    </button>
  );
}
