"use client";

import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmailCitation } from "./email-citation";
import { DraftPreview } from "./draft-preview";
import { parseCitations } from "@/lib/parse-citations";
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
  citations: existingCitations,
  draft: existingDraft,
  userImage,
  onSaveDraft,
  onCitationClick,
}: MessageBubbleProps) {
  const isUser = role === "user";

  let displayText = content;
  let draft: EmailDraft | null = existingDraft || null;
  let citations: Citation[] = existingCitations || [];

  if (!isUser) {
    const draftResult = parseDraft(displayText);
    displayText = draftResult.text;
    if (!draft) draft = draftResult.draft;

    if (citations.length === 0) {
      const citationResult = parseCitations(displayText);
      displayText = citationResult.text;
      citations = citationResult.citations;
    }
  }

  return (
    <div className="py-5">
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

        <div className={cn("flex-1 min-w-0 space-y-3", isUser && "text-right")}>
          <div
            className={cn(
              "inline-block text-[13.5px] leading-[1.7]",
              isUser
                ? "bg-foreground text-background rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%]"
                : "text-foreground max-w-full"
            )}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap text-left">{displayText}</div>
            ) : (
              <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-left text-[13.5px] leading-[1.7] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
                    li: ({ children }) => <li className="pl-0.5">{children}</li>,
                    h1: ({ children }) => <h3 className="mb-2 mt-4 text-[15px] font-semibold first:mt-0">{children}</h3>,
                    h2: ({ children }) => <h3 className="mb-2 mt-4 text-[15px] font-semibold first:mt-0">{children}</h3>,
                    h3: ({ children }) => <h4 className="mb-2 mt-3 text-[14px] font-semibold first:mt-0">{children}</h4>,
                    code: ({ children, className }) => {
                      const isBlock = className?.includes("language-");
                      if (isBlock) {
                        return (
                          <pre className="mb-3 overflow-x-auto rounded-lg bg-secondary/60 p-3 text-[12px] last:mb-0">
                            <code>{children}</code>
                          </pre>
                        );
                      }
                      return (
                        <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-[12px]">
                          {children}
                        </code>
                      );
                    },
                    blockquote: ({ children }) => (
                      <blockquote className="mb-3 border-l-2 border-border pl-3 italic text-muted-foreground last:mb-0">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="my-4 border-border" />,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2 hover:text-foreground/80">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {displayText}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {draft && (
            <div className="max-w-full">
              <DraftPreview
                draft={draft}
                onSave={() => onSaveDraft?.(draft!)}
              />
            </div>
          )}

          {citations.length > 0 && (
            <div className="space-y-1.5 max-w-md">
              {citations.map((citation) => (
                <EmailCitation
                  key={`${citation.threadId}-${citation.index}`}
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
