"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Trash2, Loader2, ChevronDown, ChevronUp, Reply } from "lucide-react";
import { useUpdateDraft, useDeleteDraft, useSendDraft } from "@/hooks/use-drafts";
import { useThread } from "@/hooks/use-thread";
import type { Draft } from "@/hooks/use-drafts";

interface DraftEditorProps {
  draft: Draft;
}

export function DraftEditor({ draft }: DraftEditorProps) {
  const router = useRouter();
  const updateDraft = useUpdateDraft();
  const deleteDraft = useDeleteDraft();
  const sendDraft = useSendDraft();

  const { data: replyThread } = useThread(draft.replyToThreadId || undefined);
  const [showThread, setShowThread] = useState(true);

  const [to, setTo] = useState(draft.to);
  const [cc, setCc] = useState(draft.cc || "");
  const [bcc, setBcc] = useState(draft.bcc || "");
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [showCcBcc, setShowCcBcc] = useState(!!(draft.cc || draft.bcc));
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [sendError, setSendError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isSent = draft.status === "sent";

  const save = useCallback(() => {
    if (isSent) return;
    setSaveStatus("saving");
    updateDraft.mutate(
      { id: draft.id, to, cc: cc || null, bcc: bcc || null, subject, body },
      {
        onSuccess: () => {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 1500);
        },
        onError: () => setSaveStatus("idle"),
      }
    );
  }, [draft.id, to, cc, bcc, subject, body, isSent, updateDraft]);

  useEffect(() => {
    if (isSent) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(save, 1000);
    return () => clearTimeout(debounceRef.current);
  }, [to, cc, bcc, subject, body, save, isSent]);

  const handleSend = async () => {
    if (!to.trim()) return;
    setSendError(null);
    setSendStatus("sending");
    try {
      await sendDraft.mutateAsync(draft.id);
      setSendStatus("sent");
      setTimeout(() => router.push("/drafts"), 1200);
    } catch (e) {
      setSendStatus("idle");
      setSendError(e instanceof Error ? e.message : "Failed to send");
    }
  };

  const handleDelete = async () => {
    await deleteDraft.mutateAsync(draft.id);
    router.push("/drafts");
  };

  const inputClass =
    "w-full bg-transparent text-[13px] py-2 px-0 border-0 border-b border-border/40 focus:border-foreground/30 focus:outline-none transition-colors placeholder:text-muted-foreground/50";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/drafts")}
          className="text-[12px] h-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Drafts
        </Button>
        {draft.replyToThreadId && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Reply className="h-3 w-3" />
            <span>Reply</span>
          </div>
        )}
        <div className="flex-1" />
        <span className="text-[11px] text-muted-foreground">
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "Saved"}
          {isSent && "Sent"}
        </span>
        {!isSent && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteDraft.isPending}
              className="text-[12px] h-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sendStatus !== "idle" || !to.trim()}
              className="text-[12px] h-8 rounded-lg"
            >
              {sendStatus === "sending" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : sendStatus === "sent" ? null : (
                <Send className="mr-1.5 h-3.5 w-3.5" />
              )}
              {sendStatus === "sending"
                ? "Sending..."
                : sendStatus === "sent"
                  ? "Sent!"
                  : "Send"}
            </Button>
          </>
        )}
      </div>

      {sendError && (
        <div className="px-5 py-2.5 bg-destructive/10 border-b border-destructive/20 text-[12px] text-destructive">
          {sendError}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-1">
          <div className="flex items-center gap-3">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground w-14 shrink-0">
              To
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@email.com"
              disabled={isSent}
              className={inputClass}
            />
            {!showCcBcc && !isSent && (
              <button
                onClick={() => setShowCcBcc(true)}
                className="text-[11px] text-muted-foreground hover:text-foreground shrink-0"
              >
                Cc/Bcc
              </button>
            )}
          </div>

          {showCcBcc && (
            <>
              <div className="flex items-center gap-3">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground w-14 shrink-0">
                  Cc
                </label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@email.com"
                  disabled={isSent}
                  className={inputClass}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground w-14 shrink-0">
                  Bcc
                </label>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@email.com"
                  disabled={isSent}
                  className={inputClass}
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground w-14 shrink-0">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              disabled={isSent}
              className={inputClass + " font-medium"}
            />
          </div>

          <div className="pt-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email..."
              disabled={isSent}
              rows={12}
              className="w-full bg-transparent text-[13px] leading-[1.8] resize-none focus:outline-none placeholder:text-muted-foreground/50"
            />
          </div>

          {replyThread && (
            <div className="border-t border-border pt-4 mt-4">
              <button
                onClick={() => setShowThread(!showThread)}
                className="flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                {showThread ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                <span className="font-medium">
                  Original thread — {replyThread.subject}
                </span>
                <span className="text-muted-foreground/60">
                  ({replyThread.messages.length} message{replyThread.messages.length !== 1 ? "s" : ""})
                </span>
              </button>

              {showThread && (
                <div className="space-y-3 pl-4 border-l-2 border-border/50">
                  {replyThread.messages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-baseline gap-2 text-[12px]">
                        <span className="font-medium text-foreground/80">
                          {msg.from.name || msg.from.email}
                        </span>
                        <span className="text-muted-foreground/60">
                          {new Date(msg.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-[12px] text-muted-foreground leading-[1.6] whitespace-pre-wrap line-clamp-6">
                        {msg.body || msg.snippet}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => router.push(`/inbox/${draft.replyToThreadId}`)}
                    className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                  >
                    View full thread in inbox
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
