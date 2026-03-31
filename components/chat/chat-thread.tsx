"use client";

import { useRef, useEffect } from "react";
import { MessageBubble } from "./message-bubble";
import { ThinkingIndicator } from "./thinking-indicator";
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
  onSuggestionClick?: (text: string) => void;
}

export function ChatThread({
  messages,
  streamingContent,
  isLoading,
  thinkingStatus,
  userImage,
  onSaveDraft,
  onCitationClick,
  onSuggestionClick,
}: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              What can I find?
            </h1>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Search your inbox with natural language or ask me to draft
              something for you.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto">
            {[
              "Emails from my team this week",
              "Draft a follow-up to Sarah",
              "Attachments from last month",
              "Summarize my unread emails",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="rounded-xl border border-border px-4 py-3 text-left text-[12px] leading-relaxed text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-secondary/50 transition-all duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 pb-6 pt-4">
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

        {isLoading && streamingContent && (
          <div className="flex items-center gap-2 py-2 pl-11">
            <div className="flex gap-1">
              <span className="h-1 w-1 rounded-full bg-foreground/30 animate-pulse" />
              <span className="h-1 w-1 rounded-full bg-foreground/30 animate-pulse [animation-delay:150ms]" />
              <span className="h-1 w-1 rounded-full bg-foreground/30 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
