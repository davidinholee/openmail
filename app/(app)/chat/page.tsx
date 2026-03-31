"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatThread } from "@/components/chat/chat-thread";
import { ChatInput } from "@/components/chat/chat-input";
import {
  useConversations,
  useCreateConversation,
  useDeleteConversation,
} from "@/hooks/use-conversations";
import { useSaveDraft } from "@/hooks/use-gmail-actions";
import type { ChatMessage } from "@/types/chat";
import type { Citation, EmailDraft } from "@/types/email";

export default function ChatPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: conversations = [] } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const saveDraft = useSaveDraft();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [thinkingStatus, setThinkingStatus] = useState<string>();

  const handleNewConversation = useCallback(async () => {
    setMessages([]);
    setActiveConversationId(undefined);
    setStreamingContent("");
  }, []);

  const handleSelectConversation = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
    },
    [router]
  );

  const handleSend = useCallback(
    async (content: string) => {
      let conversationId = activeConversationId;

      if (!conversationId) {
        const conv = await createConversation.mutateAsync();
        conversationId = conv.id;
        setActiveConversationId(conversationId);
      }

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
      setThinkingStatus("Searching your emails...");

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
          conversationId: conversationId!,
          role: "assistant",
          content:
            "Sorry, I encountered an error processing your request. Please try again.",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        setStreamingContent("");
        setThinkingStatus(undefined);
      }
    },
    [activeConversationId, messages, createConversation]
  );

  return (
    <div className="flex h-full">
      <ChatSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={(id) => deleteConversation.mutate(id)}
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
          onSuggestionClick={handleSend}
        />
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
