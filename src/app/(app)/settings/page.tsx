"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MobileSettingsView } from "@/components/mobile/MobileSettingsView";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import Link from "next/link";
import {
  Coins,
  Palette,
  User,
  ShieldCheck,
  LogOut,
  Loader2,
  Smartphone,
  Sparkles,
  Send,
  Download,
  HelpCircle,
  Sliders,
  Check,
  UploadCloud,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PWAInstallButton } from "@/components/pwa/InstallPrompt";
import { TelegramConnectCard } from "@/components/telegram/TelegramConnectCard";
import { ExportTransactionsCard } from "@/components/export/ExportTransactionsCard";
import { AIProviderCard } from "@/components/settings/AIProviderCard";
import { FAQSection } from "@/components/settings/FAQSection";

type SettingsTab = "general" | "ai" | "telegram" | "export" | "faq";

interface TabDefinition {
  id: SettingsTab;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
}

const SETTINGS_TABS: TabDefinition[] = [
  {
    id: "general",
    label: "General & Account",
    shortLabel: "General",
    description: "Bookkeeper identity, base currency denomination, ledger surface theme, and device setup.",
    icon: Sliders,
  },
  {
    id: "ai",
    label: "AI Engine (BYOK)",
    shortLabel: "AI Engine",
    description: "Bring your own API key (Groq, Gemini, Claude) with AES-256 encrypted server storage.",
    icon: Sparkles,
  },
  {
    id: "telegram",
    label: "Telegram Sync",
    shortLabel: "Telegram",
    description: "Link your Telegram account to record transactions and check balance on the move.",
    icon: Send,
  },
  {
    id: "export",
    label: "Data & Statements",
    shortLabel: "Exports",
    description: "Generate client-side CSV, Excel (.xlsx), and printable passbook PDF statements.",
    icon: Download,
  },
  {
    id: "faq",
    label: "Help & Guide",
    shortLabel: "Help / FAQ",
    description: "Comprehensive guides, common questions, and troubleshooting instructions.",
    icon: HelpCircle,
  },
];

function SettingsContent() {
  const { userProfile, updateCurrency, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Determine active tab from URL query params (default to "general")
  const initialTab = (searchParams.get("tab") as SettingsTab) || "general";
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    SETTINGS_TABS.some((t) => t.id === initialTab) ? initialTab : "general"
  );

  const [currency, setCurrency] = useState(userProfile?.currency || "INR");
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get("tab") as SettingsTab;
    if (tabParam && SETTINGS_TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    router.replace(`/settings?tab=${tabId}`, { scroll: false });
  };

  const handleCurrencyChange = async (newVal: string) => {
    setCurrency(newVal);
    setIsUpdatingCurrency(true);
    try {
      await updateCurrency(newVal);
      toast.success(`Currency preference updated to ${newVal}`);
    } catch (err: any) {
      toast.error("Failed to update currency preference");
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const currentTabInfo = SETTINGS_TABS.find((t) => t.id === activeTab) || SETTINGS_TABS[0];

  return (
    <>
      {/* ── Mobile UI (<640px) ── */}
      <div className="block sm:hidden">
        <MobileSettingsView
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currency={currency}
          isUpdatingCurrency={isUpdatingCurrency}
          onCurrencyChange={handleCurrencyChange}
        />
      </div>

      {/* ── Desktop (>=640px) ── */}
      <div className="hidden sm:block flex-1 space-y-5 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto text-ink-text">
      {/* ========================================================================= */}
      {/* 1. TOP TITLE HEADER */}
      {/* ========================================================================= */}
      <div className="border-b border-fiber-line pb-3">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
          Settings &amp; Preferences
        </h1>
        <p className="text-xs font-sans text-muted-text pt-0.5">
          Manage your account identity, AI engine configuration, Telegram sync, and passbook exports.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-NAVIGATION TABS BAR (DESKTOP & MOBILE SCROLLABLE) */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 bg-card-bg/80 dark:bg-[#090A0F]/80 backdrop-blur-xl pt-1 pb-2 border-b border-fiber-line sm:border-none transition-colors">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono whitespace-nowrap transition-all select-none shrink-0 ${isActive
                    ? "bg-stamp-red text-[#FFFFFF] font-bold shadow-stamp border border-stamp-red"
                    : "bg-card-bg text-muted-text hover:text-ink-text border border-fiber-line hover:border-muted-text/30"
                  }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#FFFFFF]" : "text-stamp-red"}`} />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ACTIVE SUB-SECTION BANNER */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-fiber-line bg-card-bg/60 text-xs font-mono text-muted-text">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-thrive-green" />
          <span className="font-bold text-ink-text uppercase tracking-wider">
            {currentTabInfo.label}
          </span>
        </div>
        <span className="hidden sm:inline text-[11px] text-muted-text">
          {currentTabInfo.description}
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 4. TAB CONTENTS */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-1">
        {/* ----------------------------------------------------------------------- */}
        {/* TAB: GENERAL & ACCOUNT */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "general" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* User Profile Card */}
            <div className="rounded-xl border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
                <User className="h-4 w-4 text-stamp-red" />
                <h2 className="font-display text-base font-bold text-ink-text">
                  Bookkeeper Identity
                </h2>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <div className="h-12 w-12 rounded-lg border border-fiber-line bg-paper-bg flex items-center justify-center font-display font-bold text-lg text-stamp-red">
                  {getInitials(userProfile?.displayName)}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-ink-text text-sm">
                      {userProfile?.displayName || "Account Holder"}
                    </h3>
                    <span className="text-[10px] font-mono uppercase text-muted-text px-1.5 py-0.2 border border-fiber-line rounded-[2px]">
                      Standard Ledger
                    </span>
                  </div>
                  <p className="text-xs font-mono text-muted-text">{userProfile?.email}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-thrive-green pt-0.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Encrypted &amp; Authenticated</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Currency Preferences */}
            <div className="rounded-xl border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
                <Coins className="h-4 w-4 text-stamp-red" />
                <h2 className="font-display text-base font-bold text-ink-text">
                  Register Currency
                </h2>
              </div>

              <p className="text-xs font-sans text-muted-text">
                Standard denomination applied across entries, totals, and breakdown summaries.
              </p>

              <div className="max-w-xs pt-1">
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  disabled={isUpdatingCurrency}
                  className="w-full h-9 rounded-lg border border-fiber-line bg-paper-bg px-3 text-xs font-mono text-ink-text focus:border-stamp-red focus:outline-none"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} — {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                {isUpdatingCurrency && (
                  <p className="text-[10px] font-mono text-stamp-red flex items-center gap-1 pt-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                  </p>
                )}
              </div>
            </div>

            {/* Appearance Theme (Paper vs Ink) */}
            <div className="rounded-xl border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
                <Palette className="h-4 w-4 text-stamp-red" />
                <h2 className="font-display text-base font-bold text-ink-text">
                  Ledger Surface &amp; Ambient Theme
                </h2>
              </div>

              <p className="text-xs font-sans text-muted-text">
                Switch between warm tactile Cream Paper or immersive Designer Obsidian Dark.
              </p>

              <div className="grid grid-cols-3 gap-3 max-w-md pt-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center justify-between rounded-lg border p-3 text-xs transition-all ${theme === "light"
                      ? "border-stamp-red bg-paper-bg text-ink-text font-bold shadow-xs ring-1 ring-stamp-red"
                      : "border-fiber-line bg-paper-bg text-muted-text hover:text-ink-text"
                    }`}
                >
                  <div className="h-6 w-6 rounded-[4px] bg-[#FDFBF7] border border-[#E8E2D4] shadow-xs mb-2" />
                  <span>Cream Paper</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center justify-between rounded-lg border p-3 text-xs transition-all ${theme === "dark"
                      ? "border-stamp-red bg-card-bg text-ink-text font-bold shadow-xs ring-1 ring-stamp-red"
                      : "border-fiber-line bg-card-bg text-muted-text hover:text-ink-text"
                    }`}
                >
                  <div className="h-6 w-6 rounded-[4px] bg-[#0A0C10] border border-[#1F2430] shadow-xs mb-2" />
                  <span>Obsidian Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center justify-between rounded-lg border p-3 text-xs transition-all ${theme === "system"
                      ? "border-stamp-red bg-paper-bg text-ink-text font-bold shadow-xs ring-1 ring-stamp-red"
                      : "border-fiber-line bg-paper-bg text-muted-text hover:text-ink-text"
                    }`}
                >
                  <div className="h-6 w-6 rounded-[4px] bg-gradient-to-r from-[#FDFBF7] to-[#0A0C10] border border-fiber-line shadow-xs mb-2" />
                  <span>System Auto</span>
                </button>
              </div>
            </div>

            {/* Progressive Web App (PWA) Card */}
            <div className="rounded-xl border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
                <Smartphone className="h-4 w-4 text-stamp-red" />
                <h2 className="font-display text-base font-bold text-ink-text">
                  Application &amp; Offline Register
                </h2>
              </div>

              <p className="text-xs font-sans text-muted-text">
                Install FinChat on your device for standalone window access, instant launching, and offline transaction buffering.
              </p>

              <div className="pt-1 flex items-center gap-3">
                <PWAInstallButton />
              </div>
            </div>

            {/* Sign Out Card */}
            <div className="rounded-xl border border-stamp-red/40 bg-card-bg p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
                <LogOut className="h-4 w-4 text-stamp-red" />
                <h2 className="font-display text-base font-bold text-stamp-red">
                  Session
                </h2>
              </div>

              <p className="text-xs font-sans text-muted-text">
                Close your active register session on this browser.
              </p>

              <button
                type="button"
                onClick={logout}
                className="h-8 px-4 rounded-lg border border-stamp-red/50 bg-paper-bg hover:bg-stamp-red/10 text-xs font-mono font-bold uppercase tracking-wider text-stamp-red transition-colors flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB: AI ENGINE (BYOK) */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "ai" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <AIProviderCard />
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB: TELEGRAM SYNC */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "telegram" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <TelegramConnectCard />
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB: DATA & EXPORTS */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "export" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Import Statement & Notes Banner */}
            <div className="rounded-xl border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-stamp-red" />
                  <h2 className="font-display text-base font-bold text-ink-text">
                    Import Historical Records (.xlsx, .csv, .docx)
                  </h2>
                </div>
                <span className="rounded bg-stamp-red/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stamp-red uppercase">
                  AI Assited
                </span>
              </div>

              <p className="text-xs font-sans text-muted-text leading-relaxed">
                Upload historical bank statements or personal Word diaries. FinChat automatically categorizes entries, identifies duplicates against your existing ledger, and provides an interactive review table before saving.
              </p>

              <div className="pt-1">
                <Link
                  href="/import"
                  className="inline-flex items-center gap-2 rounded-lg bg-stamp-red px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FFFFFF] hover:bg-stamp-red/90 shadow-sm transition-colors"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Launch Import Tool</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </div>
            </div>

            <ExportTransactionsCard />
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* TAB: HELP & FAQ */}
        {/* ----------------------------------------------------------------------- */}
        {activeTab === "faq" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <FAQSection />
          </div>
        )}
      </div>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 p-8 flex items-center justify-center text-xs font-mono text-muted-text">
          <Loader2 className="h-4 w-4 animate-spin text-stamp-red mr-2" />
          Loading Settings...
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
