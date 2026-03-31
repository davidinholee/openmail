"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp, Paperclip } from "lucide-react";
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

  const initials =
    message.from.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const formattedDate = message.date
    ? format(new Date(message.date), "MMM d, yyyy 'at' h:mm a")
    : "";

  return (
    <div
      className={cn(
        "border border-border rounded-lg",
        !expanded && "cursor-pointer hover:bg-accent/30"
      )}
    >
      <div
        className="flex items-start gap-3 p-4"
        onClick={() => !expanded && setExpanded(true)}
      >
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          <AvatarFallback className="text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold truncate">
                {message.from.name || message.from.email}
              </span>
              {!expanded && (
                <span className="text-xs text-muted-foreground truncate">
                  — {message.snippet}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {formattedDate}
              </span>
              {expanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(false);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              )}
              {!expanded && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>

          {expanded && (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">
                To: {message.to.map((a) => a.name || a.email).join(", ")}
                {message.cc.length > 0 &&
                  ` | Cc: ${message.cc.map((a) => a.name || a.email).join(", ")}`}
              </p>

              <div className="mt-4 text-sm leading-relaxed">
                {message.bodyHtml ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none [&_img]:max-w-full"
                    dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">
                    {message.body}
                  </pre>
                )}
              </div>

              {message.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {message.attachments.map((att) => (
                    <div
                      key={att.attachmentId}
                      className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs"
                    >
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">
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
    </div>
  );
}
