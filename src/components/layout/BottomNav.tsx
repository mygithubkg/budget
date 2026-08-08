"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { cn } from "@/lib/utils";

interface NavTabItem {
  href: string;
  label: string;
  iconName: string;
  exact?: boolean;
}

export function BottomNav() {
  const pathname = usePathname();

  const tabs: NavTabItem[] = [
    {
      href: "/dashboard",
      label: "Ledger",
      iconName: "receipt_long",
      exact: true,
    },
    {
      href: "/analysis",
      label: "Analysis",
      iconName: "insights",
    },
    {
      href: "/chat",
      label: "Chat",
      iconName: "forum",
    },
    {
      href: "/dashboard/friends",
      label: "Friends",
      iconName: "group",
    },
    {
      href: "/settings",
      label: "Settings",
      iconName: "settings",
    },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden">
      {/* Edge-to-Edge Glass Navigation Bar (5 Equal Tabs, No FAB) */}
      <nav
        aria-label="Mobile Navigation"
        className="h-16 bg-card-bg/90 dark:bg-[#090A0F]/90 backdrop-blur-2xl border-t border-fiber-line shadow-[0_-1px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_-1px_16px_rgba(0,0,0,0.5)] px-2 flex items-center justify-around pb-safe transition-colors"
      >
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 min-w-0 focus:outline-none group active:scale-95 transition-transform"
            >
              <div
                className={cn(
                  "flex items-center justify-center h-7 w-12 rounded-full transition-all duration-200",
                  isActive
                    ? "bg-md-primary-container text-md-on-primary-container"
                    : "text-md-on-surface-variant group-hover:text-md-on-surface"
                )}
              >
                <MaterialIcon
                  name={tab.iconName}
                  size={22}
                  fill={isActive}
                  className={cn(
                    "transition-colors duration-200",
                    isActive ? "text-md-primary" : "text-md-on-surface-variant"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold tracking-wider font-inter transition-colors duration-200 mt-0.5 truncate",
                  isActive
                    ? "text-md-primary font-bold"
                    : "text-md-on-surface-variant group-hover:text-md-on-surface"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default BottomNav;

