"use client";

import { use } from "react";
import { useDraft } from "@/hooks/use-drafts";
import { DraftEditor } from "@/components/drafts/draft-editor";
import { Loader2 } from "lucide-react";

export default function DraftEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: draft, isLoading } = useDraft(id);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-muted-foreground">Draft not found</p>
      </div>
    );
  }

  return <DraftEditor draft={draft} />;
}
