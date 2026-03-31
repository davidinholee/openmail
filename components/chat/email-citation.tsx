"use client";

import { Mail, ChevronRight } from "lucide-react";
import type { Citation } from "@/types/email";

interface EmailCitationProps {
  citation: Citation;
  onClick?: () => void;
}

export function EmailCitation({ citation, onClick }: EmailCitationProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full rounded-lg border border-border/60 bg-secondary/30 px-3.5 py-2.5 text-left hover:bg-secondary/60 hover:border-border transition-all duration-150 group"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-foreground/10 text-foreground">
        <Mail className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate leading-snug">
          <span className="text-muted-foreground/70 mr-1">[{citation.index}]</span>
          {citation.subject}
        </p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {citation.sender} · {citation.date}
        </p>
      </div>

      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}
