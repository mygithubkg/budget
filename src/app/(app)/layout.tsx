"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { AddTransactionSheet } from "@/components/transactions/AddTransactionSheet";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import MaterialIcon from "@/components/ui/MaterialIcon";
import Link from "next/link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [manualAddOpen, setManualAddOpen] = useState(false);

  const isChatPage = pathname === "/chat" || pathname?.startsWith("/chat");

  const getPageMeta = () => {
    if (pathname.startsWith("/analysis")) {
      return {
        title: "AI Financial Analysis",
        subtitle: "Predictive trends, behavioral patterns & spending intelligence",
      };
    }
    if (pathname.startsWith("/dashboard/friends")) {
      return {
        title: "Friends & Debt Register",
        subtitle: "Shared expense tracking, itemized statements & settlements",
      };
    }
    if (pathname.startsWith("/settings")) {
      return {
        title: "Settings & System",
        subtitle: "Profile, custom AI keys (BYOK), Telegram bot & export tools",
      };
    }
    if (pathname.startsWith("/import")) {
      return {
        title: "Import Statements & Logs",
        subtitle: "AI-assisted multi-row parsing for bank statements (.xlsx, .csv) & logs",
      };
    }
    return {
      title: "Financial Ledger",
      subtitle: "Account balance register, cash flow tracking & categorical spend",
    };
  };

  const { title: pageTitle, subtitle: pageSubtitle } = getPageMeta();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (
        !user.emailVerified &&
        user.providerData.some((p) => p.providerId === "password")
      ) {
        router.replace("/verify-email");
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary animate-pulse">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative flex w-full bg-transparent",
        isChatPage ? "h-[100dvh] overflow-hidden" : "min-h-screen"
      )}
    >
      {/* Desktop Sidebar */}
      <Sidebar onOpenManualAdd={() => setManualAddOpen(true)} />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex flex-1 flex-col min-w-0 overflow-x-hidden",
          isChatPage
            ? "h-[calc(100dvh-5rem)] sm:h-screen lg:h-screen overflow-hidden"
            : "pb-20 lg:pb-0"
        )}
      >
        {/* Mobile Header (<640px) */}
        <MobileHeader />

        {/* Desktop Header Top Bar (>=640px) */}
        {!isChatPage && (
          <header className="hidden sm:flex items-center justify-between px-6 lg:px-8 pt-6 pb-2 max-w-6xl w-full mx-auto">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold font-display tracking-tight text-on-surface">
                {pageTitle}
              </h1>
              <p className="text-xs text-on-surface-variant font-sans mt-0.5">
                {pageSubtitle}
              </p>
            </div>

            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary hover:bg-primary/90 active:scale-95 text-on-primary text-xs font-bold font-inter shadow-md shadow-primary/20 transition-all duration-150 group"
            >
              <MaterialIcon name="add" size={18} className="text-on-primary group-hover:rotate-90 transition-transform duration-200" />
              <span>New Entry</span>
            </Link>
          </header>
        )}

        <main className={cn("flex-1 min-w-0 pt-16 sm:pt-0", isChatPage && "h-full overflow-hidden flex flex-col")}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Manual Add Transaction Sheet */}
      <AddTransactionSheet
        open={manualAddOpen}
        onOpenChange={setManualAddOpen}
      />
    </div>
  );
}
