"use client";

import { Button } from "@/components/ui/button";
import { FileEdit, RotateCcw, Save } from "lucide-react";
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
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
        Email Draft
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium w-16">To:</span>
          <span>{draft.to}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground font-medium w-16">
            Subject:
          </span>
          <span className="font-medium">{draft.subject}</span>
        </div>

        <div className="border-t border-border pt-3">
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
            {draft.body}
          </pre>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-2 bg-muted/30">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <FileEdit className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Regenerate
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isSaving ? "Saving..." : "Save as Draft"}
        </Button>
      </div>
    </div>
  );
}
