"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmailActions } from "./email-actions";
import { MessageCard } from "./message-card";
import { Mail, Reply, ReplyAll, Loader2 } from "lucide-react";
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
  const router = useRouter();
  const [isCreatingReply, setIsCreatingReply] = useState(false);

  const handleReply = async (replyAll: boolean) => {
    if (!thread) return;
    setIsCreatingReply(true);

    const lastMessage = thread.messages[thread.messages.length - 1];
    const replyTo = lastMessage.from.email;
    const replySubject = thread.subject.startsWith("Re:")
      ? thread.subject
      : `Re: ${thread.subject}`;

    const ccList = replyAll
      ? [...lastMessage.to, ...lastMessage.cc]
          .map((a) => a.email)
          .filter((e) => e !== replyTo)
          .join(", ")
      : undefined;

    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: replyTo,
          cc: ccList || null,
          subject: replySubject,
          body: "",
          replyToThreadId: thread.id,
        }),
      });
      if (res.ok) {
        const draft = await res.json();
        router.push(`/drafts/${draft.id}`);
      }
    } finally {
      setIsCreatingReply(false);
    }
  };
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

          <div className="flex items-center gap-2 py-6 border-t border-border/40 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReply(false)}
              disabled={isCreatingReply}
              className="text-[12px] h-8 rounded-lg"
            >
              {isCreatingReply ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Reply className="mr-1.5 h-3.5 w-3.5" />
              )}
              Reply
            </Button>
            {thread.messages.length > 0 &&
              (thread.messages[thread.messages.length - 1].to.length > 1 ||
                thread.messages[thread.messages.length - 1].cc.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReply(true)}
                disabled={isCreatingReply}
                className="text-[12px] h-8 rounded-lg"
              >
                <ReplyAll className="mr-1.5 h-3.5 w-3.5" />
                Reply All
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
