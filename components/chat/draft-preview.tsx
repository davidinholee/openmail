"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save, Pencil, Check, X, Send, Loader2, ExternalLink, Reply } from "lucide-react";
import type { EmailDraft } from "@/types/email";

interface DraftPreviewProps {
  draft: EmailDraft;
  messageId?: string;
  initialSent?: boolean;
  onRegenerate?: () => void;
  onSave?: (draft: EmailDraft) => void;
  onSend?: (draft: EmailDraft) => void;
  isSaving?: boolean;
  isSending?: boolean;
}

export function DraftPreview({
  draft,
  messageId,
  initialSent,
  onRegenerate,
  onSave,
  onSend,
  isSaving,
  isSending,
}: DraftPreviewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editTo, setEditTo] = useState(draft.to);
  const [editSubject, setEditSubject] = useState(draft.subject);
  const [editBody, setEditBody] = useState(draft.body);
  const [saved, setSaved] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(draft.draftId || null);
  const [sent, setSent] = useState(initialSent || false);
  const [sendError, setSendError] = useState<string | null>(null);

  const currentDraft: EmailDraft = isEditing
    ? { to: editTo, subject: editSubject, body: editBody, replyToThreadId: draft.replyToThreadId }
    : draft;

  const handleStartEdit = () => {
    setEditTo(draft.to);
    setEditSubject(draft.subject);
    setEditBody(draft.body);
    setIsEditing(true);
  };

  const persistDraftStatus = async (draftId: string, isSent: boolean) => {
    if (!messageId) return;
    await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft: { ...currentDraft, draftId, sent: isSent },
      }),
    }).catch(() => {});
  };

  const handleSave = async () => {
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: currentDraft.to,
        subject: currentDraft.subject,
        body: currentDraft.body,
        replyToThreadId: currentDraft.replyToThreadId || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setSavedDraftId(data.id);
      setSaved(true);
      await persistDraftStatus(data.id, false);
      onSave?.(currentDraft);
    }
  };

  const handleSend = async () => {
    let draftId = savedDraftId;

    if (!draftId) {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: currentDraft.to,
          subject: currentDraft.subject,
          body: currentDraft.body,
          replyToThreadId: currentDraft.replyToThreadId || null,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      draftId = data.id;
    }

    setSendError(null);
    const sendRes = await fetch(`/api/drafts/${draftId}/send`, {
      method: "POST",
    });
    if (sendRes.ok) {
      setSent(true);
      await persistDraftStatus(draftId!, true);
      onSend?.(currentDraft);
    } else {
      const err = await sendRes.json().catch(() => null);
      setSendError(err?.error || "Failed to send");
    }
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-secondary/50 px-4 py-2 text-[11px] font-medium text-muted-foreground tracking-wide uppercase border-b border-border flex items-center gap-2">
        {draft.replyToThreadId ? (
          <>
            <Reply className="h-3 w-3" />
            Reply
          </>
        ) : (
          "Draft"
        )}
      </div>

      <div className="p-5 space-y-3">
        {draft.replyToThreadId && (
          <button
            onClick={() => router.push(`/inbox/${draft.replyToThreadId}`)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            View original thread
          </button>
        )}

        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground text-[11px] uppercase tracking-wider w-14 shrink-0">To</span>
            {isEditing ? (
              <input
                type="text"
                value={editTo}
                onChange={(e) => setEditTo(e.target.value)}
                className="flex-1 bg-secondary/50 rounded-md px-2.5 py-1.5 text-[13px] border border-border focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            ) : (
              <span>{draft.to}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[13px]">
            <span className="text-muted-foreground text-[11px] uppercase tracking-wider w-14 shrink-0">Subject</span>
            {isEditing ? (
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="flex-1 bg-secondary/50 rounded-md px-2.5 py-1.5 text-[13px] font-medium border border-border focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            ) : (
              <span className="font-medium">{draft.subject}</span>
            )}
          </div>
        </div>

        <div className="border-t border-border/60 pt-4">
          {isEditing ? (
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={8}
              className="w-full bg-secondary/50 rounded-md px-2.5 py-2 text-[13px] leading-[1.7] border border-border focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-y"
            />
          ) : (
            <pre className="text-[13px] whitespace-pre-wrap font-sans leading-[1.7] text-foreground/90">
              {draft.body}
            </pre>
          )}
        </div>
      </div>

      {sendError && (
        <div className="px-4 py-2.5 bg-destructive/10 border-t border-destructive/20 text-[12px] text-destructive">
          {sendError}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        {sent ? (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground font-medium">
            <Send className="h-3 w-3" />
            Email sent successfully
          </div>
        ) : isEditing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="text-[12px] h-8 text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1.5 h-3 w-3" />
              Cancel
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={() => {
                setIsEditing(false);
                handleSave();
              }}
              disabled={isSaving}
              className="text-[12px] h-8 rounded-lg"
            >
              <Check className="mr-1.5 h-3 w-3" />
              Save Edits
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEdit}
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
            {saved && savedDraftId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/drafts/${savedDraftId}`)}
                className="text-[12px] h-8 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="mr-1.5 h-3 w-3" />
                Open in Drafts
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || saved}
                className="text-[12px] h-8 text-muted-foreground hover:text-foreground"
              >
                <Save className="mr-1.5 h-3 w-3" />
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSend}
              disabled={isSending}
              className="text-[12px] h-8 rounded-lg"
            >
              {isSending ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-3 w-3" />
              )}
              {isSending ? "Sending..." : "Send"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
