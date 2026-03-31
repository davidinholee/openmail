"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailActions } from "./email-actions";
import { MessageCard } from "./message-card";
import type { EmailThread } from "@/types/email";

interface ThreadDetailProps {
  thread: EmailThread | null;
  isLoading: boolean;
  onBack: () => void;
  onArchive: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}

export function ThreadDetail({
  thread,
  isLoading,
  onBack,
  onArchive,
  onToggleStar,
  onToggleRead,
  onDelete,
}: ThreadDetailProps) {
  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-6 py-3">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Select a thread to read</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h1 className="text-lg font-semibold truncate pr-4">
          {thread.subject}
        </h1>
        <EmailActions
          isUnread={thread.isUnread}
          isStarred={thread.isStarred}
          onBack={onBack}
          onArchive={onArchive}
          onToggleStar={onToggleStar}
          onToggleRead={onToggleRead}
          onDelete={onDelete}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {thread.messages.map((message, idx) => (
            <MessageCard
              key={message.id}
              message={message}
              isLast={idx === thread.messages.length - 1}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
