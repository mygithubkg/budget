"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface MobileHeaderProps {
  titleOverride?: string;
}

export function MobileHeader({ titleOverride }: MobileHeaderProps) {
  const pathname = usePathname();
  const { userProfile, user } = useAuth();

  // Determine current page title based on pathname
  let pageTitle = "Ledger";
  if (titleOverride) {
    pageTitle = titleOverride;
  } else if (pathname.includes("/friends")) {
    pageTitle = "Friends";
  } else if (pathname.includes("/analysis")) {
    pageTitle = "Insights";
  } else if (pathname.includes("/chat")) {
    pageTitle = "AI Register";
  } else if (pathname.includes("/settings")) {
    pageTitle = "Settings";
  } else if (pathname.includes("/dashboard")) {
    pageTitle = "Ledger";
  }

  const initials = (userProfile?.displayName || user?.displayName || user?.email || "ME")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="fixed top-0 inset-x-0 z-30 h-16 bg-card-bg/85 dark:bg-[#090A0F]/85 backdrop-blur-xl border-b border-fiber-line shadow-[0_1px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_12px_rgba(0,0,0,0.4)] px-4 flex items-center justify-between sm:hidden transition-colors">
      {/* Left: Brand / Logo Icon + Page Title */}
      <div className="flex items-center gap-2.5">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-primary/20 text-md-primary border border-md-primary/30 group-active:scale-95 transition-transform">
            <MaterialIcon name="account_balance_wallet" size={18} />
          </div>
        </Link>
        <h1 className="text-xl font-bold font-inter tracking-tight text-md-on-surface">
          {pageTitle}
        </h1>
      </div>

      {/* Right: User Avatar Circle */}
      <Link href="/settings" className="flex items-center gap-2 active:scale-95 transition-transform">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-md-primary/30 to-md-secondary/30 text-xs font-bold font-inter text-md-on-surface ring-1 ring-md-outline/30 shadow-inner">
          {initials}
        </div>
      </Link>
    </header>
  );
}

export default MobileHeader;
