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
      <div className="hidden sm:block flex-1 space-y-6 p-6 lg:p-8 max-w-4xl mx-auto text-on-surface">
        {/* ========================================================================= */}
        {/* SUB-NAVIGATION TABS BAR */}
        {/* ========================================================================= */}
        <div className="sticky top-0 z-30 bg-surface-container-low/90 backdrop-blur-xl p-1.5 rounded-2xl border border-outline-variant/40 transition-colors shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-jetbrains-mono whitespace-nowrap transition-all select-none shrink-0 ${
                    isActive
                      ? "bg-primary text-on-primary font-bold shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-on-primary" : "text-primary"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. ACTIVE SUB-SECTION BANNER */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-outline-variant/40 bg-surface-container text-xs font-jetbrains-mono text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-bold text-on-surface uppercase tracking-wider">
              {currentTabInfo.label}
            </span>
          </div>
          <span className="text-[11px] text-on-surface-variant">
            {currentTabInfo.description}
          </span>
        </div>

        {/* ========================================================================= */}
        {/* 4. TAB CONTENTS */}
        {/* ========================================================================= */}
        <div className="space-y-6 pt-1">
          {/* ----------------------------------------------------------------------- */}
          {/* TAB: GENERAL & ACCOUNT */}
          {/* ----------------------------------------------------------------------- */}
          {activeTab === "general" && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* User Profile Card */}
              <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-4">
                <div className="flex items-center gap-2.5 border-b border-outline-variant/40 pb-3">
                  <User className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-bold text-on-surface">
                    Bookkeeper Identity
                  </h2>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <div className="h-14 w-14 rounded-2xl border border-outline-variant/40 bg-surface-container-low flex items-center justify-center font-jetbrains-mono font-bold text-xl text-primary shadow-sm">
                    {getInitials(userProfile?.displayName)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-on-surface text-base">
                        {userProfile?.displayName || "Account Holder"}
                      </h3>
                      <span className="text-[10px] font-jetbrains-mono uppercase text-on-surface-variant px-2 py-0.5 border border-outline-variant/40 rounded-full bg-surface-container-low">
                        Standard Ledger
                      </span>
                    </div>
                    <p className="text-xs font-jetbrains-mono text-on-surface-variant">{userProfile?.email}</p>
                    <div className="flex items-center gap-1.5 text-[10px] font-jetbrains-mono text-emerald-500 pt-0.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Encrypted &amp; Authenticated</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Currency Preferences */}
              <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-4">
                <div className="flex items-center gap-2.5 border-b border-outline-variant/40 pb-3">
                  <Coins className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-bold text-on-surface">
                    Register Currency
                  </h2>
                </div>

                <p className="text-xs font-sans text-on-surface-variant">
                  Standard denomination applied across entries, totals, and breakdown summaries.
                </p>

                <div className="max-w-xs pt-1">
                  <select
                    value={currency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    disabled={isUpdatingCurrency}
                    className="w-full h-10 rounded-2xl border border-outline-variant/40 bg-surface-container-low px-3.5 text-xs font-jetbrains-mono text-on-surface focus:border-primary focus:outline-none"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.symbol} — {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                  {isUpdatingCurrency && (
                    <p className="text-[10px] font-jetbrains-mono text-primary flex items-center gap-1 pt-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                    </p>
                  )}
                </div>
              </div>

              {/* Appearance Theme */}
              <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-4">
                <div className="flex items-center gap-2.5 border-b border-outline-variant/40 pb-3">
                  <Palette className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-bold text-on-surface">
                    Ledger Surface &amp; Ambient Theme
                  </h2>
                </div>

                <p className="text-xs font-sans text-on-surface-variant">
                  Switch between clean Material Light or immersive Designer Dark.
                </p>

                <div className="grid grid-cols-3 gap-3 max-w-md pt-1 font-jetbrains-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex flex-col items-center justify-between rounded-2xl border p-3.5 text-xs transition-all ${
                      theme === "light"
                        ? "border-primary bg-surface-container-high text-on-surface font-bold shadow-sm ring-1 ring-primary"
                        : "border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <div className="h-6 w-6 rounded-lg bg-[#FFFFFF] border border-[#E0E0E0] shadow-xs mb-2" />
                    <span>Material Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col items-center justify-between rounded-2xl border p-3.5 text-xs transition-all ${
                      theme === "dark"
                        ? "border-primary bg-surface-container-high text-on-surface font-bold shadow-sm ring-1 ring-primary"
                        : "border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <div className="h-6 w-6 rounded-lg bg-[#111318] border border-[#2D3039] shadow-xs mb-2" />
                    <span>Material Dark</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`flex flex-col items-center justify-between rounded-2xl border p-3.5 text-xs transition-all ${
                      theme === "system"
                        ? "border-primary bg-surface-container-high text-on-surface font-bold shadow-sm ring-1 ring-primary"
                        : "border-outline-variant/40 bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <div className="h-6 w-6 rounded-lg bg-gradient-to-r from-[#FFFFFF] to-[#111318] border border-outline-variant/40 shadow-xs mb-2" />
                    <span>System Auto</span>
                  </button>
                </div>
              </div>

              {/* Progressive Web App (PWA) Card */}
              <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-4">
                <div className="flex items-center gap-2.5 border-b border-outline-variant/40 pb-3">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-bold text-on-surface">
                    Application &amp; Offline Register
                  </h2>
                </div>

                <p className="text-xs font-sans text-on-surface-variant">
                  Install FinChat on your device for standalone window access, instant launching, and offline transaction buffering.
                </p>

                <div className="pt-1 flex items-center gap-3">
                  <PWAInstallButton />
                </div>
              </div>

              {/* Sign Out Card */}
              <div className="rounded-3xl border border-error/30 bg-surface-container p-6 desktop-card-hover space-y-4">
                <div className="flex items-center gap-2.5 border-b border-outline-variant/40 pb-3">
                  <LogOut className="h-4 w-4 text-error" />
                  <h2 className="font-display text-base font-bold text-error">
                    Session
                  </h2>
                </div>

                <p className="text-xs font-sans text-on-surface-variant">
                  Close your active register session on this browser.
                </p>

                <button
                  type="button"
                  onClick={logout}
                  className="h-9 px-4 rounded-2xl border border-error/40 bg-surface-container-low hover:bg-error/10 text-xs font-jetbrains-mono font-bold uppercase tracking-wider text-error transition-colors flex items-center gap-1.5 shadow-sm"
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
              <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                  <div className="flex items-center gap-2.5">
                    <UploadCloud className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-base font-bold text-on-surface">
                      Import Historical Records (.xlsx, .csv, .docx)
                    </h2>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-jetbrains-mono text-[10px] font-bold text-primary uppercase">
                    AI Assisted
                  </span>
                </div>

                <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                  Upload historical bank statements or personal Word diaries. FinChat automatically categorizes entries, identifies duplicates against your existing ledger, and provides an interactive review table before saving.
                </p>

                <div className="pt-1">
                  <Link
                    href="/import"
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-jetbrains-mono font-bold uppercase tracking-wider text-on-primary hover:bg-primary/90 shadow-sm transition-colors"
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
