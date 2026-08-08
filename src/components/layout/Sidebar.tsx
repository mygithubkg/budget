"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface SidebarProps {
  onOpenManualAdd?: () => void;
}

export function Sidebar({ onOpenManualAdd }: SidebarProps) {
  const pathname = usePathname();
  const { userProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: "/dashboard",        label: "Ledger",      iconName: "receipt_long", exact: true },
    { href: "/analysis",         label: "AI Analysis", iconName: "insights",     exact: true },
    { href: "/chat",             label: "Chat",        iconName: "forum",        exact: true },
    { href: "/dashboard/friends",label: "Friends",     iconName: "group" },
    { href: "/settings",         label: "Settings",    iconName: "settings" },
  ];

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <aside className="hidden sm:flex h-screen w-16 lg:w-[248px] flex-col justify-between border-r border-outline-variant/40 dark:border-white/[0.06] bg-surface-container-low p-3 lg:p-4 shrink-0 select-none transition-all duration-200 z-30">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Brand Header */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-2 py-2 group rounded-2xl hover:bg-surface-container-high/60 transition-colors"
          title="FinChat Ledger"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 bg-primary text-on-primary shadow-md shadow-primary/25">
            <MaterialIcon name="account_balance_wallet" size={22} className="text-on-primary" />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-bold tracking-tight text-on-surface">
                FinChat
              </span>
              <span className="text-[10px] font-mono uppercase text-on-surface-variant px-1.5 py-0.5 border border-outline-variant/60 rounded-md bg-surface-container-high">
                Ledger
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-sans truncate">Material Register</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1.5">
          <div className="hidden lg:block px-2.5 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-on-surface-variant/80">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center lg:justify-start gap-3 rounded-2xl px-3 py-2.5 text-xs font-semibold font-inter transition-all duration-150 group",
                  isActive
                    ? "bg-primary-container text-on-primary-container dark:bg-primary-container/30 dark:text-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high/80 hover:text-on-surface"
                )}
                title={item.label}
              >
                <div
                  className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-xl transition-colors",
                    isActive
                      ? "text-primary dark:text-primary"
                      : "text-on-surface-variant group-hover:text-on-surface"
                  )}
                >
                  <MaterialIcon
                    name={item.iconName}
                    size={20}
                    fill={isActive}
                  />
                </div>
                <span className="hidden lg:inline text-xs tracking-wide">{item.label}</span>
                {isActive && (
                  <div className="hidden lg:block ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User + Theme Toggle + Sign Out */}
      <div className="space-y-3 pt-3 border-t border-outline-variant/40 dark:border-white/[0.06]">
        <div className="flex items-center justify-center lg:justify-between px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar className="h-9 w-9 border border-outline-variant/40 rounded-2xl shrink-0">
              <AvatarFallback className="bg-primary-container text-on-primary-container font-jetbrains-mono font-bold text-xs rounded-2xl">
                {getInitials(userProfile?.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block overflow-hidden">
              <div className="truncate text-xs font-semibold text-on-surface">
                {userProfile?.displayName || "Account Holder"}
              </div>
              <div className="truncate text-[11px] font-jetbrains-mono text-on-surface-variant">
                {userProfile?.currency || "INR"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center lg:justify-between gap-1.5 pt-1">
          <button
            className="flex items-center justify-center lg:justify-start gap-2 px-2.5 py-1.5 rounded-xl text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/80 transition-colors flex-1"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to Creamy Paper mode" : "Switch to Obsidian Ink mode"}
          >
            {theme === "dark" ? (
              <>
                <MaterialIcon name="light_mode" size={16} className="text-amber-500 shrink-0" />
                <span className="hidden lg:inline font-mono text-[11px]">Cream</span>
              </>
            ) : (
              <>
                <MaterialIcon name="dark_mode" size={16} className="text-primary shrink-0" />
                <span className="hidden lg:inline font-mono text-[11px]">Obsidian</span>
              </>
            )}
          </button>

          <button
            className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors shrink-0 flex items-center justify-center"
            onClick={logout}
            title="Sign out"
          >
            <MaterialIcon name="logout" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
