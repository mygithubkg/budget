"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import {
  Coins,
  Palette,
  User,
  ShieldCheck,
  LogOut,
  Loader2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { PWAInstallButton } from "@/components/pwa/InstallPrompt";

export default function SettingsPage() {
  const { userProfile, updateCurrency, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [currency, setCurrency] = useState(userProfile?.currency || "INR");
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);

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

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto text-ink-text">
      {/* Header */}
      <div className="border-b border-fiber-line pb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
          Ledger Preferences & Account
        </h1>
        <p className="text-xs font-sans text-muted-text pt-0.5">
          Configure default currencies, paper/ink display themes, and ledger access.
        </p>
      </div>

      <div className="space-y-4">
        {/* User Profile Card */}
        <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
            <User className="h-4 w-4 text-stamp-indigo" />
            <h2 className="font-display text-base font-bold text-ink-text">
              Bookkeeper Identity
            </h2>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <div className="h-12 w-12 rounded-[6px] border border-fiber-line bg-paper-bg flex items-center justify-center font-display font-bold text-lg text-stamp-indigo">
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
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-passbook-gold pt-0.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Encrypted & Authenticated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Currency Preferences */}
        <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
            <Coins className="h-4 w-4 text-stamp-indigo" />
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
              className="w-full h-9 rounded-[4px] border border-fiber-line bg-paper-bg px-3 text-xs font-mono text-ink-text focus:border-stamp-indigo focus:outline-none"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.name} ({c.code})
                </option>
              ))}
            </select>
            {isUpdatingCurrency && (
              <p className="text-[10px] font-mono text-stamp-indigo flex items-center gap-1 pt-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
              </p>
            )}
          </div>
        </div>

        {/* Appearance Theme (Paper vs Ink) */}
        <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
            <Palette className="h-4 w-4 text-stamp-indigo" />
            <h2 className="font-display text-base font-bold text-ink-text">
              Ledger Surface & Ink
            </h2>
          </div>

          <p className="text-xs font-sans text-muted-text">
            Choose between cream ruled paper register or iron-gall ink dark register.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-md pt-1 font-mono text-xs">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center justify-between rounded-[6px] border p-3 text-xs transition-all ${
                theme === "light"
                  ? "border-stamp-indigo bg-paper-bg text-ink-text font-bold shadow-xs"
                  : "border-fiber-line bg-paper-bg text-muted-text hover:text-ink-text"
              }`}
            >
              <div className="h-5 w-5 rounded-[2px] bg-[#F6F3E7] border border-[#D5CEBA] mb-2" />
              <span>Paper Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center justify-between rounded-[6px] border p-3 text-xs transition-all ${
                theme === "dark"
                  ? "border-stamp-indigo bg-card-bg text-ink-text font-bold shadow-xs"
                  : "border-fiber-line bg-card-bg text-muted-text hover:text-ink-text"
              }`}
            >
              <div className="h-5 w-5 rounded-[2px] bg-[#101216] border border-[#272C35] mb-2" />
              <span>Ink Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("system")}
              className={`flex flex-col items-center justify-between rounded-[6px] border p-3 text-xs transition-all ${
                theme === "system"
                  ? "border-stamp-indigo bg-paper-bg text-ink-text font-bold shadow-xs"
                  : "border-fiber-line bg-paper-bg text-muted-text hover:text-ink-text"
              }`}
            >
              <div className="h-5 w-5 rounded-[2px] bg-gradient-to-r from-[#F6F3E7] to-[#101216] border border-fiber-line mb-2" />
              <span>System</span>
            </button>
          </div>
        </div>

        {/* Progressive Web App (PWA) Card */}
        <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
            <Smartphone className="h-4 w-4 text-stamp-indigo" />
            <h2 className="font-display text-base font-bold text-ink-text">
              Application & Offline Register
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
        <div className="rounded-[8px] border border-rule-red/40 bg-card-bg p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
            <LogOut className="h-4 w-4 text-rule-red" />
            <h2 className="font-display text-base font-bold text-rule-red">
              Session
            </h2>
          </div>

          <p className="text-xs font-sans text-muted-text">
            Close your active register session on this browser.
          </p>

          <button
            onClick={logout}
            className="h-8 px-4 rounded-[4px] border border-rule-red/50 bg-paper-bg hover:bg-rule-red/10 text-xs font-mono font-bold uppercase tracking-wider text-rule-red transition-colors flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
