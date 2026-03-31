"use client";

import { useParams, useRouter } from "next/navigation";
import { ThreadDetail } from "@/components/inbox/thread-detail";
import { useThread } from "@/hooks/use-thread";
import { useGmailModify } from "@/hooks/use-gmail-actions";

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;
  const { data: thread, isLoading } = useThread(threadId);
  const modify = useGmailModify();

  const lastMessageId = thread?.messages[thread.messages.length - 1]?.id;

  return (
    <ThreadDetail
      thread={thread || null}
      isLoading={isLoading}
      onBack={() => router.push("/inbox")}
      onArchive={() => {
        if (lastMessageId) {
          modify.mutate({
            messageId: lastMessageId,
            removeLabelIds: ["INBOX"],
          });
          router.push("/inbox");
        }
      }}
      onToggleStar={() => {
        if (lastMessageId && thread) {
          modify.mutate({
            messageId: lastMessageId,
            ...(thread.isStarred
              ? { removeLabelIds: ["STARRED"] }
              : { addLabelIds: ["STARRED"] }),
          });
        }
      }}
      onToggleRead={() => {
        if (lastMessageId && thread) {
          modify.mutate({
            messageId: lastMessageId,
            ...(thread.isUnread
              ? { removeLabelIds: ["UNREAD"] }
              : { addLabelIds: ["UNREAD"] }),
          });
        }
      }}
      onDelete={() => {
        if (lastMessageId) {
          modify.mutate({
            messageId: lastMessageId,
            addLabelIds: ["TRASH"],
          });
          router.push("/inbox");
        }
      }}
    />
  );
}
