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
  Sparkles,
  LogOut,
  Moon,
  Sun,
  PlusCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  onOpenManualAdd?: () => void;
}

export function Sidebar({ onOpenManualAdd }: SidebarProps) {
  const pathname = usePathname();
  const { userProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const navItems = [
    {
      href: "/chat",
      label: "AI Chat",
      icon: MessageSquare,
      exact: true,
      badge: "AI",
    },
    {
      href: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: "/dashboard/trends",
      label: "Trends",
      icon: TrendingUp,
    },
    {
      href: "/dashboard/categories",
      label: "Categories",
      icon: PieChart,
    },
    {
      href: "/dashboard/friends",
      label: "Friends & Debt",
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
    <aside className="hidden lg:flex h-screen w-72 flex-col justify-between border-r border-border bg-card/60 backdrop-blur-xl p-5 shrink-0 select-none">
      {/* Top section */}
      <div className="space-y-6">
        {/* Brand logo */}
        <Link
          href="/chat"
          className="flex items-center gap-3 px-2 py-1 group transition-transform hover:scale-[1.02]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/20 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                FinChat
              </span>
              <Badge variant="purple" className="text-[10px] px-1.5 py-0 h-4">
                Groq 70B
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Smart Finance Tracker</p>
          </div>
        </Link>

        {/* Quick Action: Add Transaction */}
        {onOpenManualAdd && (
          <Button
            onClick={onOpenManualAdd}
            variant="outline"
            className="w-full justify-start gap-2.5 rounded-xl border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-primary text-xs font-semibold h-10 shadow-none"
          >
            <PlusCircle className="h-4 w-4" />
            <span>+ Add Transaction</span>
          </Button>
        )}

        {/* Navigation list */}
        <nav className="space-y-1.5">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Navigation
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
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform group-hover:scale-110",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && !isActive && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom user profile and settings card */}
      <div className="space-y-3 pt-4 border-t border-border/80">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {getInitials(userProfile?.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <div className="truncate text-xs font-semibold text-foreground">
                {userProfile?.displayName || "User"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {userProfile?.email || ""}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-mono shrink-0">
            {userProfile?.currency || "INR"}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2 h-9 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span>Light mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-400" />
                <span>Dark mode</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={logout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
