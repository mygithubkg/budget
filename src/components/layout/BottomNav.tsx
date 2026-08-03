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
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/chat",
      label: "Chat",
      icon: MessageSquare,
      exact: true,
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-border bg-background/85 px-2 backdrop-blur-lg lg:hidden">
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
              "relative flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-medium transition-all",
              isActive
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-transform",
                isActive && "scale-110"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span>{item.label}</span>
            {isActive && (
              <span className="absolute -top-[1px] h-0.5 w-6 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
