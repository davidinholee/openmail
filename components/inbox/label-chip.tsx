import { cn } from "@/lib/utils";

const LABEL_COLORS: Record<string, string> = {
  INBOX: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  IMPORTANT:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  SENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  DRAFT:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  SPAM: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TRASH: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  STARRED:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

const CATEGORY_DISPLAY: Record<string, string> = {
  CATEGORY_PRIMARY: "Primary",
  CATEGORY_SOCIAL: "Social",
  CATEGORY_PROMOTIONS: "Promotions",
  CATEGORY_UPDATES: "Updates",
  CATEGORY_FORUMS: "Forums",
};

interface LabelChipProps {
  label: string;
  className?: string;
}

export function LabelChip({ label, className }: LabelChipProps) {
  const systemLabels = [
    "INBOX",
    "SENT",
    "DRAFT",
    "SPAM",
    "TRASH",
    "UNREAD",
    "STARRED",
    "IMPORTANT",
  ];
  if (label === "UNREAD") return null;

  const displayName =
    CATEGORY_DISPLAY[label] ||
    (systemLabels.includes(label)
      ? label.charAt(0) + label.slice(1).toLowerCase()
      : label);

  const colorClass =
    LABEL_COLORS[label] ||
    "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
        colorClass,
        className
      )}
    >
      {displayName}
    </span>
  );
}
