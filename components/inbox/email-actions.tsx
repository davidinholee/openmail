"use client";

import { Button } from "@/components/ui/button";
import {
  Archive,
  Star,
  Mail,
  MailOpen,
  ArrowLeft,
  Trash2,
} from "lucide-react";

interface EmailActionsProps {
  isUnread: boolean;
  isStarred: boolean;
  onBack: () => void;
  onArchive: () => void;
  onToggleStar: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}

export function EmailActions({
  isUnread,
  isStarred,
  onBack,
  onArchive,
  onToggleStar,
  onToggleRead,
  onDelete,
}: EmailActionsProps) {
  const actions = [
    { icon: ArrowLeft, label: "Back", onClick: onBack },
    { icon: Archive, label: "Archive", onClick: onArchive },
    {
      icon: Star,
      label: isStarred ? "Unstar" : "Star",
      onClick: onToggleStar,
      className: isStarred ? "text-yellow-500" : "",
      fill: isStarred,
    },
    {
      icon: isUnread ? MailOpen : Mail,
      label: isUnread ? "Mark as read" : "Mark as unread",
      onClick: onToggleRead,
    },
    {
      icon: Trash2,
      label: "Delete",
      onClick: onDelete,
      className: "text-destructive",
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="ghost"
          size="icon"
          onClick={action.onClick}
          className={`h-8 w-8 ${action.className || ""}`}
          title={action.label}
        >
          <action.icon
            className={`h-4 w-4 ${action.fill ? "fill-current" : ""}`}
          />
        </Button>
      ))}
    </div>
  );
}
