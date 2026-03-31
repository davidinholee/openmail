"use client";

import { Button } from "@/components/ui/button";
import { RotateCcw, Save, Pencil } from "lucide-react";
import type { EmailDraft } from "@/types/email";

interface DraftPreviewProps {
  draft: EmailDraft;
  onEdit?: () => void;
  onRegenerate?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
}

export function DraftPreview({
  draft,
  onEdit,
  onRegenerate,
  onSave,
  isSaving,
}: DraftPreviewProps) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-secondary/50 px-4 py-2 text-[11px] font-medium text-muted-foreground tracking-wide uppercase border-b border-border">
        Draft
      </div>

      <div className="p-5 space-y-3">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground text-[11px] uppercase tracking-wider w-14">To</span>
            <span>{draft.to}</span>
          </div>
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground text-[11px] uppercase tracking-wider w-14">Subject</span>
            <span className="font-medium">{draft.subject}</span>
          </div>
        </div>

        <div className="border-t border-border/60 pt-4">
          <pre className="text-[13px] whitespace-pre-wrap font-sans leading-[1.7] text-foreground/90">
            {draft.body}
          </pre>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="text-[12px] h-8 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="mr-1.5 h-3 w-3" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          className="text-[12px] h-8 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="mr-1.5 h-3 w-3" />
          Regenerate
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="text-[12px] h-8 rounded-lg"
        >
          <Save className="mr-1.5 h-3 w-3" />
          {isSaving ? "Saving..." : "Save as Draft"}
        </Button>
      </div>
    </div>
  );
}
