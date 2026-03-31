"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Inbox,
  Star,
  FileEdit,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { UserMenu } from "./user-menu";

const navItems = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/priority", label: "Priority", icon: Star },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/drafts", label: "Drafts", icon: FileEdit },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-card border-r border-border transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4">
        {!collapsed && (
          <span className="text-[15px] font-semibold tracking-tight">
            OpenMail
          </span>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "text-muted-foreground hover:text-foreground transition-colors p-1",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] tracking-wide transition-all duration-150",
                isActive
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className={cn("h-[15px] w-[15px] shrink-0", collapsed && "mx-auto")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-4">
        <UserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
