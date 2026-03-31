"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { EmailCitation } from "./email-citation";
import { DraftPreview } from "./draft-preview";
import type { Citation, EmailDraft } from "@/types/email";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  draft?: EmailDraft;
  userImage?: string;
  onSaveDraft?: (draft: EmailDraft) => void;
  onCitationClick?: (citation: Citation) => void;
}

function parseDraft(content: string): { text: string; draft: EmailDraft | null } {
  const draftMatch = content.match(
    /---DRAFT---\s*\nTO:\s*(.+)\nSUBJECT:\s*(.+)\nBODY:\s*\n([\s\S]*?)---END DRAFT---/
  );

  if (!draftMatch) return { text: content, draft: null };

  const text = content.replace(
    /---DRAFT---[\s\S]*?---END DRAFT---/,
    ""
  ).trim();

  return {
    text,
    draft: {
      to: draftMatch[1].trim(),
      subject: draftMatch[2].trim(),
      body: draftMatch[3].trim(),
    },
  };
}

export function MessageBubble({
  role,
  content,
  citations,
  draft: existingDraft,
  userImage,
  onSaveDraft,
  onCitationClick,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const { text, draft: parsedDraft } = isUser
    ? { text: content, draft: null }
    : parseDraft(content);
  const draft = existingDraft || parsedDraft;

  return (
    <div
      className={cn("flex gap-3 py-4", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <Avatar className="h-7 w-7 shrink-0 mt-1">
        {isUser ? (
          <>
            <AvatarImage src={userImage} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </>
        ) : (
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        )}
      </Avatar>

      <div
        className={cn(
          "flex-1 space-y-3 min-w-0",
          isUser ? "text-right" : "text-left"
        )}
      >
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[85%]",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm"
          )}
        >
          <div className="whitespace-pre-wrap text-left">{text}</div>
        </div>

        {draft && (
          <div className="max-w-[85%]">
            <DraftPreview
              draft={draft}
              onSave={() => onSaveDraft?.(draft)}
            />
          </div>
        )}

        {citations && citations.length > 0 && (
          <div className="space-y-2 max-w-[85%]">
            {citations.map((citation) => (
              <EmailCitation
                key={citation.messageId}
                citation={citation}
                onClick={() => onCitationClick?.(citation)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
