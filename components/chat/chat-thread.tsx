"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { ThinkingIndicator } from "./thinking-indicator";
import { MessageSquare } from "lucide-react";
import type { ChatMessage } from "@/types/chat";
import type { Citation, EmailDraft } from "@/types/email";

interface ChatThreadProps {
  messages: ChatMessage[];
  streamingContent?: string;
  isLoading: boolean;
  thinkingStatus?: string;
  userImage?: string;
  onSaveDraft?: (draft: EmailDraft) => void;
  onCitationClick?: (citation: Citation) => void;
}

export function ChatThread({
  messages,
  streamingContent,
  isLoading,
  thinkingStatus,
  userImage,
  onSaveDraft,
  onCitationClick,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          How can I help?
        </h2>
        <p className="text-sm text-center max-w-md">
          Search your emails using natural language or ask me to draft an email
          for you.
        </p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
          {[
            "What emails did I get from my team this week?",
            "Draft a follow-up email to Sarah about the project",
            "Find emails with attachments from last month",
            "Summarize my unread emails",
          ].map((suggestion) => (
            <button
              key={suggestion}
              className="rounded-lg border border-border px-3 py-2 text-left text-xs hover:bg-accent/50 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto px-4 pb-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            citations={msg.citations}
            draft={msg.draft}
            userImage={userImage}
            onSaveDraft={onSaveDraft}
            onCitationClick={onCitationClick}
          />
        ))}

        {streamingContent && (
          <MessageBubble
            role="assistant"
            content={streamingContent}
            userImage={userImage}
          />
        )}

        {isLoading && !streamingContent && (
          <ThinkingIndicator status={thinkingStatus} />
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
