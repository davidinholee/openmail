"use client";

import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@/types/chat";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ChatSidebarProps) {
  return (
    <div className="flex h-full w-56 flex-col border-r border-border bg-card">
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          History
        </span>
        <button
          onClick={onNew}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:scale-95 transition-all duration-150"
          title="New chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-4 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="px-3 py-8 text-center text-[11px] text-muted-foreground/50 italic">
              No conversations
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-150",
                  activeId === conv.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
                onClick={() => onSelect(conv.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[12px]">
                    {conv.title || "New conversation"}
                  </p>
                  <p className={cn(
                    "text-[10px] mt-0.5",
                    activeId === conv.id ? "text-background/50" : "text-muted-foreground/50"
                  )}>
                    {formatDistanceToNow(new Date(conv.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className={cn(
                    "opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
                    activeId === conv.id ? "text-background/50 hover:text-background" : ""
                  )}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
