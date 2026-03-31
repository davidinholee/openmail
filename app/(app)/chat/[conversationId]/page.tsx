"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatThread } from "@/components/chat/chat-thread";
import { ChatInput } from "@/components/chat/chat-input";
import {
  useConversations,
  useConversationMessages,
  useDeleteConversation,
} from "@/hooks/use-conversations";
import { useSaveDraft } from "@/hooks/use-gmail-actions";
import type { ChatMessage } from "@/types/chat";
import type { Citation, EmailDraft } from "@/types/email";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const conversationId = params.conversationId as string;

  const { data: conversations = [] } = useConversations();
  const { data: savedMessages } = useConversationMessages(conversationId);
  const deleteConversation = useDeleteConversation();
  const saveDraft = useSaveDraft();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState<string>();

  useEffect(() => {
    if (savedMessages) {
      setMessages(savedMessages);
    }
  }, [savedMessages]);

  const handleSend = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setStreamingContent("");
      setThinkingStatus("Thinking...");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("[chat] API error:", response.status, errorBody);
          throw new Error(`Chat request failed (${response.status}): ${errorBody}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          setStreamingContent(fullContent);
          if (chunk.length > 0) {
            setThinkingStatus(undefined);
          }
        }

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          conversationId,
          role: "assistant",
          content: fullContent,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent("");
      } catch (error) {
        console.error("Chat error:", error);
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          conversationId,
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please try again.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setStreamingContent("");
        setThinkingStatus(undefined);
      }
    },
    [conversationId, messages]
  );

  return (
    <div className="flex h-full">
      <ChatSidebar
        conversations={conversations}
        activeId={conversationId}
        onSelect={(id) => router.push(`/chat/${id}`)}
        onNew={() => router.push("/chat")}
        onDelete={(id) => {
          deleteConversation.mutate(id);
          if (id === conversationId) router.push("/chat");
        }}
      />

      <div className="flex flex-1 flex-col">
        <ChatThread
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
          thinkingStatus={thinkingStatus}
          userImage={session?.user?.image || undefined}
          onSaveDraft={(draft: EmailDraft) => saveDraft.mutate(draft)}
          onCitationClick={(citation: Citation) =>
            router.push(`/inbox/${citation.threadId}`)
          }
        />
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
