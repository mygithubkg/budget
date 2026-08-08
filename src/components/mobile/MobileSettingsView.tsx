"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import Link from "next/link";
import { toast } from "sonner";
import { motion, useReducedMotion } from "motion/react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { PWAInstallButton } from "@/components/pwa/InstallPrompt";
import { TelegramConnectCard } from "@/components/telegram/TelegramConnectCard";
import { ExportTransactionsCard } from "@/components/export/ExportTransactionsCard";
import { AIProviderCard } from "@/components/settings/AIProviderCard";
import { FAQSection } from "@/components/settings/FAQSection";
import { Loader2 } from "lucide-react";

type SettingsTab = "general" | "ai" | "telegram" | "export" | "faq";

interface MobileSettingsViewProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  currency: string;
  isUpdatingCurrency: boolean;
  onCurrencyChange: (val: string) => void;
}

const MOBILE_TABS: {
  id: SettingsTab;
  label: string;
  icon: string;
}[] = [
  { id: "general", label: "General", icon: "tune" },
  { id: "ai", label: "AI", icon: "auto_awesome" },
  { id: "telegram", label: "Telegram", icon: "send" },
  { id: "export", label: "Exports", icon: "download" },
  { id: "faq", label: "Help", icon: "help" },
];

export function MobileSettingsView({
  activeTab,
  onTabChange,
  currency,
  isUpdatingCurrency,
  onCurrencyChange,
}: MobileSettingsViewProps) {
  const { userProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();

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
    <div className="space-y-4 px-3.5 py-2 pb-24 text-md-on-surface font-inter">
      {/* ── Page Title ── */}
      <h1 className="text-xl font-bold tracking-tight text-md-on-surface font-inter">
        Settings
      </h1>

      {/* ── Segmented Pill Tab Switcher ── */}
      <div className="flex rounded-full bg-md-surface-container-high border border-fiber-line dark:border-white/[0.06] p-1 text-xs font-medium overflow-x-auto gap-0.5 no-scrollbar">
        {MOBILE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 rounded-full whitespace-nowrap transition-all font-inter ${
              activeTab === tab.id
                ? "bg-md-surface-bright text-md-on-surface font-bold shadow-sm"
                : "text-md-on-surface-variant hover:text-md-on-surface"
            }`}
          >
            <MaterialIcon
              name={tab.icon}
              size={14}
              fill={activeTab === tab.id}
            />
            <span className="text-[11px]">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: GENERAL ── */}
      {activeTab === "general" && (
        <div className="space-y-3">
          {/* Profile Card */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[24px] bg-md-surface-container-high border border-fiber-line dark:border-white/[0.08] p-5 md-hero-shadow"
          >
            <div className="absolute inset-0 md-sheen pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-md-primary/30 to-md-secondary/30 text-md-on-surface font-bold text-lg ring-1 ring-md-outline/30 shadow-inner font-inter">
                {getInitials(userProfile?.displayName)}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-md-on-surface font-inter truncate">
                  {userProfile?.displayName || "Account Holder"}
                </h2>
                <p className="text-xs text-md-on-surface-variant font-inter truncate">
                  {userProfile?.email}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <MaterialIcon
                    name="verified_user"
                    size={14}
                    className="text-md-tertiary"
                  />
                  <span className="text-[10px] font-medium text-md-tertiary font-inter">
                    Encrypted & Authenticated
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Currency Card */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
            className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-primary-container/30 text-md-primary">
                <MaterialIcon name="currency_exchange" size={18} />
              </div>
              <h3 className="text-sm font-bold text-md-on-surface font-inter">
                Currency
              </h3>
            </div>
            <p className="text-xs text-md-on-surface-variant font-inter">
              Standard denomination for entries and summaries.
            </p>
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              disabled={isUpdatingCurrency}
              className="w-full h-10 rounded-2xl border border-fiber-line dark:border-white/[0.06] bg-md-surface-container-high px-3 text-sm font-inter text-md-on-surface focus:border-md-primary focus:outline-none"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.name} ({c.code})
                </option>
              ))}
            </select>
            {isUpdatingCurrency && (
              <p className="text-[10px] text-md-primary flex items-center gap-1 font-inter">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </p>
            )}
          </motion.div>

          {/* Theme Card */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
            className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-secondary-container/30 text-md-secondary">
                <MaterialIcon name="palette" size={18} />
              </div>
              <h3 className="text-sm font-bold text-md-on-surface font-inter">
                Appearance
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  key: "light",
                  label: "Cream",
                  icon: "light_mode",
                  preview: "bg-[#FDFBF7] border-[#E8E2D4]",
                },
                {
                  key: "dark",
                  label: "Obsidian",
                  icon: "dark_mode",
                  preview: "bg-[#0A0C10] border-[#1F2430]",
                },
                {
                  key: "system",
                  label: "Auto",
                  icon: "brightness_auto",
                  preview:
                    "bg-gradient-to-r from-[#FDFBF7] to-[#0A0C10] border-fiber-line",
                },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTheme(opt.key)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all active:scale-95 ${
                    theme === opt.key
                      ? "border-md-primary bg-md-primary-container/20 text-md-on-surface font-bold ring-1 ring-md-primary"
                      : "border-fiber-line dark:border-white/[0.06] bg-md-surface-container-high text-md-on-surface-variant"
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-full border shadow-inner ${opt.preview}`}
                  />
                  <span className="text-[11px] font-inter">{opt.label}</span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* PWA Install Card */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
            className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-tertiary-container/30 text-md-tertiary">
                <MaterialIcon name="install_mobile" size={18} />
              </div>
              <h3 className="text-sm font-bold text-md-on-surface font-inter">
                Install App
              </h3>
            </div>
            <p className="text-xs text-md-on-surface-variant font-inter">
              Install FinChat for standalone access and offline buffering.
            </p>
            <PWAInstallButton />
          </motion.div>

          {/* Sign Out Card */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
            className="rounded-[24px] bg-md-surface-container border border-md-error/30 p-4 md-card-shadow space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-error-container/30 text-md-error">
                <MaterialIcon name="logout" size={18} />
              </div>
              <h3 className="text-sm font-bold text-md-error font-inter">
                Session
              </h3>
            </div>
            <p className="text-xs text-md-on-surface-variant font-inter">
              Close your active register session.
            </p>
            <button
              type="button"
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full rounded-full bg-md-error/10 border border-md-error/30 py-2.5 text-sm font-bold text-md-error font-inter active:scale-95 transition-transform"
            >
              <MaterialIcon name="logout" size={18} />
              <span>Sign Out</span>
            </button>
          </motion.div>
        </div>
      )}

      {/* ── TAB: AI ENGINE ── */}
      {activeTab === "ai" && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
        >
          <AIProviderCard />
        </motion.div>
      )}

      {/* ── TAB: TELEGRAM ── */}
      {activeTab === "telegram" && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
        >
          <TelegramConnectCard />
        </motion.div>
      )}

      {/* ── TAB: EXPORTS ── */}
      {activeTab === "export" && (
        <div className="space-y-3">
          {/* Import Link Card */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-md-secondary-container/30 text-md-secondary">
                  <MaterialIcon name="upload_file" size={18} />
                </div>
                <h3 className="text-sm font-bold text-md-on-surface font-inter">
                  Import Records
                </h3>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-md-secondary-container text-md-on-secondary-container font-inter">
                <MaterialIcon name="auto_awesome" size={10} />
                AI
              </span>
            </div>
            <p className="text-xs text-md-on-surface-variant font-inter">
              Upload .xlsx, .csv, or .docx historical records.
            </p>
            <Link
              href="/import"
              className="flex items-center justify-center gap-2 w-full rounded-full bg-md-on-surface text-md-surface py-2.5 text-sm font-bold font-inter shadow-md active:scale-95 transition-transform"
            >
              <MaterialIcon name="file_open" size={18} />
              <span>Launch Import Tool</span>
            </Link>
          </motion.div>

          {/* Export Card (wrapped) */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
          >
            <ExportTransactionsCard />
          </motion.div>
        </div>
      )}

      {/* ── TAB: FAQ ── */}
      {activeTab === "faq" && (
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
        >
          <FAQSection />
        </motion.div>
      )}
    </div>
  );
}

export default MobileSettingsView;
