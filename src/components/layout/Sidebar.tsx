"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  LayoutDashboard,
  TrendingUp,
  PieChart,
  Users,
  Settings,
  LogOut,
  Moon,
  Sun,
  Plus,
  BookOpen,
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
    {
      href: "/dashboard",
      label: "Ledger",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/chat",
      label: "AI Register",
      icon: MessageSquare,
      exact: true,
    },
    {
      href: "/dashboard/trends",
      label: "Trends & Charts",
      icon: TrendingUp,
    },
    {
      href: "/dashboard/categories",
      label: "Categories",
      icon: PieChart,
    },
    {
      href: "/dashboard/friends",
      label: "Friend Debts",
      icon: Users,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <aside className="hidden sm:flex h-screen sm:w-16 lg:w-60 flex-col justify-between border-r border-fiber-line bg-card-bg p-3 lg:p-4 shrink-0 select-none transition-all duration-200">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Brand Header */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-2 py-1.5 group"
          title="FinChat Ledger"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-stamp-indigo text-[#EDE7D6] shrink-0 font-display font-bold text-base shadow-sm">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-lg font-bold tracking-tight text-ink-text">
                FinChat
              </span>
              <span className="text-[10px] font-mono uppercase text-muted-text px-1 py-0.2 border border-fiber-line rounded-[3px]">
                Ledger
              </span>
            </div>
            <p className="text-[11px] text-muted-text font-sans truncate">Account Register</p>
          </div>
        </Link>

        {/* Quick Action: Log Entry */}
        {onOpenManualAdd && (
          <button
            onClick={onOpenManualAdd}
            className="w-full flex items-center justify-center lg:justify-start gap-2 rounded-[6px] border border-fiber-line hover:border-stamp-indigo bg-paper-bg hover:bg-card-bg px-2.5 py-2 text-xs font-medium text-ink-text transition-colors"
            title="Manual Entry"
          >
            <Plus className="h-4 w-4 text-stamp-indigo shrink-0" />
            <span className="hidden lg:inline font-mono text-[11px] tracking-wide uppercase">New Entry</span>
          </button>
        )}

        {/* Navigation items */}
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
                  "flex items-center justify-center lg:justify-between rounded-[6px] px-2.5 py-2 text-xs font-medium transition-colors group",
                  isActive
                    ? "bg-stamp-indigo text-[#EDE7D6] font-semibold shadow-sm"
                    : "text-ink-text/80 hover:bg-paper-bg hover:text-ink-text"
                )}
                title={item.label}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-[#EDE7D6]" : "text-ink-text/70 group-hover:text-ink-text"
                    )}
                  />
                  <span className="hidden lg:inline">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom section: User, Mode toggle, Signout */}
      <div className="space-y-2 pt-3 border-t border-fiber-line">
        {/* User summary */}
        <div className="flex items-center justify-center lg:justify-between px-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <Avatar className="h-7 w-7 border border-fiber-line rounded-[4px] shrink-0">
              <AvatarFallback className="bg-paper-bg text-ink-text font-mono font-bold text-[11px] rounded-[4px]">
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

        {/* Paper / Ink Mode Toggle & Sign Out */}
        <div className="flex items-center justify-center lg:justify-between gap-1 pt-1">
          <button
            className="flex items-center justify-center lg:justify-start gap-1.5 px-2 py-1.5 rounded-[4px] text-[11px] text-muted-text hover:text-ink-text hover:bg-paper-bg transition-colors flex-1"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to Paper (Light) mode" : "Switch to Ink (Dark) mode"}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-passbook-gold shrink-0" />
                <span className="hidden lg:inline font-mono">Paper</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-stamp-indigo shrink-0" />
                <span className="hidden lg:inline font-mono">Ink</span>
              </>
            )}
          </button>

          <button
            className="p-1.5 rounded-[4px] text-muted-text hover:text-rule-red hover:bg-paper-bg transition-colors shrink-0"
            onClick={logout}
            title="Sign out of ledger"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
