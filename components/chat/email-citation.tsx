"use client";

import { ExternalLink } from "lucide-react";
import type { Citation } from "@/types/email";

interface EmailCitationProps {
  citation: Citation;
  onClick?: () => void;
}

export function EmailCitation({ citation, onClick }: EmailCitationProps) {
  const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${citation.threadId}`;

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-border p-3.5 hover:bg-secondary/50 transition-all duration-150 cursor-pointer group"
      onClick={onClick}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground text-background text-[10px] font-semibold mt-0.5">
        {citation.index}
      </span>

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-[13px] font-medium truncate">
          {citation.subject}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {citation.sender} · {citation.date}
        </p>
        {citation.snippet && (
          <p className="text-[11px] text-muted-foreground/60 truncate mt-1">
            {citation.snippet}
          </p>
        )}
      </div>

      <a
        href={gmailUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
      >
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
      </a>
    </div>
  );
}
