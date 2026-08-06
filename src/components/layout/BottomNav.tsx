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
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

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
      href: "/analysis",
      label: "Analysis",
      icon: Sparkles,
      exact: true,
    },
    {
      href: "/dashboard/friends",
      label: "Friends",
      icon: Users,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-fiber-line bg-card-bg px-1 sm:hidden">
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
              "relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-mono tracking-tight transition-colors",
              isActive
                ? "text-stamp-red font-bold"
                : "text-muted-text hover:text-ink-text"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive && "text-stamp-red")} />
            <span>{item.label}</span>
            {isActive && (
              <span className="absolute -top-[1px] h-0.5 w-5 rounded-full bg-stamp-red" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
