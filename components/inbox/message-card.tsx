"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Paperclip } from "lucide-react";
import { format } from "date-fns";
import type { ParsedEmail } from "@/types/email";

interface MessageCardProps {
  message: ParsedEmail;
  isLast: boolean;
  defaultExpanded?: boolean;
}

export function MessageCard({
  message,
  isLast,
  defaultExpanded = false,
}: MessageCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || isLast);

  const initial = (message.from.name || message.from.email || "?")[0].toUpperCase();

  const formattedDate = message.date
    ? format(new Date(message.date), "MMM d, yyyy 'at' h:mm a")
    : "";

  return (
    <div className={cn("group", !expanded && "cursor-pointer")}>
      <div
        className="flex items-start gap-4 py-5"
        onClick={() => !expanded && setExpanded(true)}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium mt-0.5">
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[13px] font-semibold">
                {message.from.name || message.from.email}
              </span>
              {!expanded && (
                <span className="text-[12px] text-muted-foreground truncate">
                  — {message.snippet}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground">
                {formattedDate}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
                  expanded && "rotate-180"
                )}
              />
            </div>
          </div>

          {expanded && (
            <>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                To: {message.to.map((a) => a.name || a.email).join(", ")}
                {message.cc.length > 0 &&
                  ` · Cc: ${message.cc.map((a) => a.name || a.email).join(", ")}`}
              </p>

              <div className="mt-5 text-[13.5px] leading-[1.7] text-foreground/90">
                {message.bodyHtml ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-[1.7] prose-p:text-[13.5px] [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">
                    {message.body}
                  </pre>
                )}
              </div>

              {message.attachments.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {message.attachments.map((att) => (
                    <div
                      key={att.attachmentId}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate max-w-[180px]">
                        {att.filename}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {!isLast && <div className="ml-[52px] border-b border-border/50" />}
    </div>
  );
}
