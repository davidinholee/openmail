"use client";

import { useRouter } from "next/navigation";
import { Plus, FileEdit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDrafts, useCreateDraft } from "@/hooks/use-drafts";
import { DraftListItem } from "@/components/drafts/draft-list-item";

export default function DraftsPage() {
  const router = useRouter();
  const { data: allDrafts = [], isLoading } = useDrafts();
  const createDraft = useCreateDraft();

  const activeDrafts = allDrafts.filter((d) => d.status === "draft");
  const sentDrafts = allDrafts.filter((d) => d.status === "sent");

  const handleCompose = async () => {
    const draft = await createDraft.mutateAsync({});
    router.push(`/drafts/${draft.id}`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h1 className="text-[15px] font-semibold tracking-tight">Drafts</h1>
        <Button
          size="sm"
          onClick={handleCompose}
          disabled={createDraft.isPending}
          className="text-[12px] h-8 rounded-lg"
        >
          {createDraft.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-3.5 w-3.5" />
          )}
          Compose
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/40">
                <div className="h-8 w-8 rounded-full bg-secondary animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-secondary animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-secondary animate-pulse" />
                  <div className="h-2.5 w-1/2 rounded bg-secondary animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activeDrafts.length === 0 && sentDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4">
              <FileEdit className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-[15px] font-semibold mb-1">No drafts yet</h2>
            <p className="text-[13px] text-muted-foreground mb-4">
              Compose a new email or save a draft from the chat.
            </p>
            <Button
              size="sm"
              onClick={handleCompose}
              disabled={createDraft.isPending}
              className="text-[12px] h-8 rounded-lg"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Compose
            </Button>
          </div>
        ) : (
          <div>
            {activeDrafts.length > 0 && (
              <div>
                {activeDrafts.map((draft) => (
                  <DraftListItem key={draft.id} draft={draft} />
                ))}
              </div>
            )}
            {sentDrafts.length > 0 && (
              <div>
                <div className="px-5 py-2 text-[11px] uppercase tracking-wider text-muted-foreground bg-secondary/30 border-b border-border/40">
                  Sent
                </div>
                {sentDrafts.map((draft) => (
                  <DraftListItem key={draft.id} draft={draft} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
