"use client";

export function ThinkingIndicator({ status }: { status?: string }) {
  return (
    <div className="flex items-center gap-4 py-5">
      <div className="h-7 w-7 shrink-0 rounded-full bg-foreground flex items-center justify-center">
        <span className="text-[11px] font-bold text-background">O</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
        </div>
        {status && (
          <span className="text-[12px] text-muted-foreground/60">
            {status}
          </span>
        )}
      </div>
    </div>
  );
}
