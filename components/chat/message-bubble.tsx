"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    <div className={cn("py-5", !isUser && "")}>
      <div className={cn("flex gap-4", isUser ? "flex-row-reverse" : "flex-row")}>
        {isUser ? (
          <Avatar className="h-7 w-7 shrink-0 mt-0.5">
            <AvatarImage src={userImage} />
            <AvatarFallback className="text-[10px] font-medium bg-foreground text-background">
              Y
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-7 w-7 shrink-0 mt-0.5 rounded-full bg-foreground flex items-center justify-center">
            <span className="text-[11px] font-bold text-background">O</span>
          </div>
        )}

        <div className={cn("flex-1 min-w-0 space-y-4", isUser && "text-right")}>
          <div
            className={cn(
              "inline-block text-[13.5px] leading-[1.7]",
              isUser
                ? "bg-foreground text-background rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]"
                : "text-foreground max-w-full"
            )}
          >
            <div className={cn("whitespace-pre-wrap", isUser ? "text-left" : "text-left")}>
              {text}
            </div>
          </div>

          {draft && (
            <div className="max-w-full">
              <DraftPreview
                draft={draft}
                onSave={() => onSaveDraft?.(draft)}
              />
            </div>
          )}

          {citations && citations.length > 0 && (
            <div className="space-y-2">
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
    </div>
  );
}
