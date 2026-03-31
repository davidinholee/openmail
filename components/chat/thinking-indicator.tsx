"use client";

import { Loader2 } from "lucide-react";

export function ThinkingIndicator({ status }: { status?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{status || "Thinking..."}</span>
    </div>
  );
}
