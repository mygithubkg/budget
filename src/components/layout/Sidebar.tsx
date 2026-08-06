"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  Plus,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarProps {
  onOpenManualAdd?: () => void;
}

export function Sidebar({ onOpenManualAdd }: SidebarProps) {
  const pathname = usePathname();
  const { userProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/dashboard",        label: "Ledger",      icon: LayoutDashboard, exact: true },
    { href: "/chat",             label: "AI Register", icon: MessageSquare,   exact: true },
    { href: "/analysis",         label: "Analysis",    icon: Sparkles,        exact: true },
    { href: "/dashboard/friends",label: "Friends",     icon: Users },
    { href: "/settings",         label: "Settings",    icon: Settings },
  ];

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <aside className="hidden sm:flex h-screen sm:w-16 lg:w-64 flex-col justify-between border-r border-fiber-line bg-card-bg shadow-card dark:shadow-none p-3 lg:p-4 shrink-0 select-none transition-all duration-200">
      {/* Top Section */}
      <div className="space-y-5">
        {/* Brand Header */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-2 py-2 group rounded-xl hover:bg-paper-bg transition-colors"
          title="FinChat Ledger"
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0 shadow-stamp"
            style={{ background: "var(--sig-gradient)" }}
          >
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-bold tracking-tight text-ink-text">
                FinChat
              </span>
              <span className="text-[10px] font-mono uppercase text-muted-text px-1.5 py-0.5 border border-fiber-line rounded bg-paper-bg">
                Ledger
              </span>
            </div>
            <p className="text-[11px] text-muted-text font-sans truncate">Account Register</p>
          </div>
        </Link>

        {/* Quick Action: New Entry */}
        {onOpenManualAdd && (
          <button
            onClick={onOpenManualAdd}
            className="w-full flex items-center justify-center lg:justify-start gap-2 rounded-xl border border-stamp-red/30 bg-stamp-red/5 hover:bg-stamp-red/10 hover:border-stamp-red/50 px-3 py-2.5 text-xs font-mono font-bold uppercase tracking-wide text-stamp-red transition-all"
            title="Manual Entry"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">New Entry</span>
          </button>
        )}

        {/* Navigation */}
        <nav className="space-y-1">
          <div className="hidden lg:block px-2 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-text">
            Sections
          </div>
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center lg:justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all group",
                  isActive
                    ? "bg-stamp-red text-white font-semibold shadow-xs"
                    : "text-ink-text/70 hover:bg-paper-bg hover:text-ink-text"
                )}
                title={item.label}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-white" : "text-ink-text/60 group-hover:text-ink-text"
                    )}
                  />
                  <span className="hidden lg:inline">{item.label}</span>
                </div>
                {isActive && (
                  <div className="hidden lg:block h-1.5 w-1.5 rounded-full bg-white/60" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User + Toggle + Sign Out */}
      <div className="space-y-2 pt-3 border-t border-fiber-line">
        <div className="flex items-center justify-center lg:justify-between px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar className="h-8 w-8 border border-fiber-line rounded-xl shrink-0">
              <AvatarFallback className="bg-stamp-red/10 text-stamp-red font-mono font-bold text-[11px] rounded-xl">
                {getInitials(userProfile?.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block overflow-hidden">
              <div className="truncate text-xs font-semibold text-ink-text">
                {userProfile?.displayName || "User"}
              </div>
              <div className="truncate text-[10px] font-mono text-muted-text">
                {userProfile?.currency || "INR"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-between gap-1 pt-1">
          <button
            className="flex items-center justify-center lg:justify-start gap-1.5 px-2 py-1.5 rounded-xl text-[11px] text-muted-text hover:text-ink-text hover:bg-paper-bg transition-colors flex-1"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to Paper mode" : "Switch to Ink mode"}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-thrive-green shrink-0" />
                <span className="hidden lg:inline font-mono">Paper</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-stamp-red shrink-0" />
                <span className="hidden lg:inline font-mono">Ink</span>
              </>
            )}
          </button>

          <button
            className="p-1.5 rounded-xl text-muted-text hover:text-stamp-red hover:bg-stamp-red/5 transition-colors shrink-0"
            onClick={logout}
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
