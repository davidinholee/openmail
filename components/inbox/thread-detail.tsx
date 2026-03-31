"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailActions } from "./email-actions";
import { MessageCard } from "./message-card";
import { Mail } from "lucide-react";
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
        <div className="border-b border-border px-8 py-5">
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="flex-1 px-8 py-6 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
        <Mail className="h-8 w-8 mb-3 opacity-20" />
        <p className="text-sm font-medium text-muted-foreground">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-8 py-4">
        <h1 className="text-lg font-semibold truncate pr-6">
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
        <div className="max-w-3xl mx-auto px-8 py-2">
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
