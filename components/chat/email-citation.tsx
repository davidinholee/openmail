"use client";

import { Mail, ExternalLink } from "lucide-react";
import type { Citation } from "@/types/email";

interface EmailCitationProps {
  citation: Citation;
  onClick?: () => void;
}

export function EmailCitation({ citation, onClick }: EmailCitationProps) {
  const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${citation.threadId}`;

  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
        <Mail className="h-4 w-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary">
            [{citation.index}]
          </span>
          <span className="text-sm font-medium truncate">
            {citation.subject}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {citation.sender} &middot; {citation.date}
        </p>
        {citation.snippet && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {citation.snippet}
          </p>
        )}
      </div>

      <a
        href={gmailUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </a>
    </div>
  );
}
