"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  ArrowRight,
  Sparkles,
  Send,
  Download,
  Key,
  ShieldCheck,
  Zap,
  Users,
  CheckCircle2,
  Lock,
  Loader2,
  Menu,
  X,
} from "lucide-react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authenticated users are automatically routed to the ledger
  useEffect(() => {
    if (!loading && user) {
      if (!user.emailVerified && user.providerData.some((p) => p.providerId === "password")) {
        router.replace("/verify-email");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, router]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navigateTo = (path: string) => {
    setMobileMenuOpen(false);
    router.push(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex items-center gap-2.5 text-xs font-jetbrains-mono text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Loading FinChat Ledger...</span>
        </div>
      </div>
    );
  }

  // If user is authenticated, avoid flashing landing page while redirect executes
  if (user) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-transparent text-on-surface selection:bg-primary/20 font-sans transition-colors">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 border-b border-outline-variant/40 dark:border-white/[0.08] bg-surface/85 backdrop-blur-xl transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 group text-left cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary font-display font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-on-surface">
                FinChat
              </span>
              <span className="text-[10px] font-jetbrains-mono uppercase text-on-surface-variant px-2 py-0.5 border border-outline-variant/40 rounded-full bg-surface-container-low">
                Ledger
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-jetbrains-mono uppercase tracking-wider text-on-surface-variant">
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="hover:text-on-surface transition-colors py-1 cursor-pointer"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("how-it-works")}
              className="hover:text-on-surface transition-colors py-1 cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("telegram")}
              className="hover:text-on-surface transition-colors py-1 cursor-pointer"
            >
              Telegram Sync
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("byok")}
              className="hover:text-on-surface transition-colors py-1 cursor-pointer"
            >
              BYOK Engine
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("faq")}
              className="hover:text-on-surface transition-colors py-1 cursor-pointer"
            >
              FAQ
            </button>
          </nav>

          {/* Header CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo("/login")}
              className="px-4 py-2 text-xs font-jetbrains-mono text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/login?tab=signup")}
              className="px-4 py-2 rounded-2xl bg-primary hover:bg-primary/90 text-xs font-jetbrains-mono font-bold text-on-primary transition-all shadow-sm flex items-center gap-1.5 hover:shadow cursor-pointer"
            >
              <span>Open Register</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-on-surface hover:text-primary rounded-xl"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-outline-variant/40 bg-surface-container px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
            <nav className="flex flex-col space-y-2 text-xs font-jetbrains-mono uppercase text-on-surface-variant text-left">
              <button
                type="button"
                onClick={() => scrollToSection("features")}
                className="py-1.5 hover:text-on-surface text-left cursor-pointer"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("how-it-works")}
                className="py-1.5 hover:text-on-surface text-left cursor-pointer"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("telegram")}
                className="py-1.5 hover:text-on-surface text-left cursor-pointer"
              >
                Telegram Sync
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("byok")}
                className="py-1.5 hover:text-on-surface text-left cursor-pointer"
              >
                BYOK Engine
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("faq")}
                className="py-1.5 hover:text-on-surface text-left cursor-pointer"
              >
                FAQ
              </button>
            </nav>
            <div className="pt-3 border-t border-outline-variant/40 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => navigateTo("/login")}
                className="w-full text-center py-2.5 text-xs font-jetbrains-mono border border-outline-variant/40 rounded-2xl bg-surface-container-low text-on-surface font-medium cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => navigateTo("/login?tab=signup")}
                className="w-full text-center py-2.5 text-xs font-jetbrains-mono font-bold bg-primary text-on-primary rounded-2xl shadow-sm cursor-pointer"
              >
                Open Free Register
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 dark:border-white/[0.08] bg-surface-container px-4 py-1.5 text-[11px] font-jetbrains-mono text-on-surface-variant uppercase tracking-wider shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>The Authentic Ruled Ledger Reimagined</span>
          </div>

          {/* Main Title */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-on-surface leading-[1.15] max-w-4xl mx-auto">
            The conversational ledger for people who{" "}
            <span className="text-primary italic font-serif underline decoration-primary/40 decoration-wavy decoration-2">
              hate budgeting apps.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg font-sans text-on-surface-variant leading-relaxed">
            Ditch the endless form dropdowns and messy spreadsheets. Just write or speak what you spent, who you split with, or what you earned in plain natural language.
          </p>

          {/* CTA Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              type="button"
              onClick={() => navigateTo("/login?tab=signup")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-sm font-jetbrains-mono font-bold text-on-primary transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Open Your Free Ledger</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("demo")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-outline-variant/40 dark:border-white/[0.08] bg-surface-container hover:bg-surface-container-high text-sm font-jetbrains-mono text-on-surface transition-colors shadow-xs cursor-pointer"
            >
              See Live Register Demo
            </button>
          </div>

          {/* Trust points */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-jetbrains-mono text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> 100% Client-Side Exports
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-emerald-500" /> AES-256 Encrypted BYOK
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No Ad Tracking or Data Selling
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. HERO INTERACTIVE LEDGER SHOWCASE */}
        {/* ========================================================================= */}
        <div id="demo" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-12 scroll-mt-24">
          <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.08] bg-surface-container shadow-2xl overflow-hidden desktop-card-hover">
            {/* Top Passbook Titlebar */}
            <div className="flex items-center justify-between border-b border-outline-variant/40 dark:border-white/[0.06] bg-surface-container-low px-5 py-3 text-xs font-jetbrains-mono text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-bold text-on-surface uppercase tracking-wider">
                  FOLIO 2026-08 • REGISTER DEMO
                </span>
              </div>
              <span className="text-emerald-500 font-bold uppercase tracking-wider text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                AUTO-STAMPED
              </span>
            </div>

            {/* Simulated Ruled Register Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* User Message */}
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary text-on-primary flex items-center justify-center text-xs font-jetbrains-mono font-bold shrink-0 shadow-sm">
                  YOU
                </div>
                <div className="rounded-2xl bg-surface-container-high border border-outline-variant/40 dark:border-white/[0.06] p-3.5 text-sm font-sans text-on-surface shadow-xs max-w-lg">
                  &quot;Paid 2400 for electricity bill, 600 for grocery, and Sam owes 200 for coffee&quot;
                </div>
              </div>

              {/* Bot Response Stamp & Breakdown */}
              <div className="space-y-3 pl-0 sm:pl-11">
                <div className="flex items-center gap-2 text-xs font-jetbrains-mono uppercase text-primary font-bold">
                  <Sparkles className="h-4 w-4" />
                  <span>3 Transactions Extracted &amp; Posted to Passbook</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-jetbrains-mono text-xs">
                  <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 dark:border-white/[0.06] space-y-1">
                    <div className="text-on-surface-variant text-[10px] uppercase">Bills &amp; Utilities</div>
                    <div className="font-bold text-on-surface text-sm">Electricity Bill</div>
                    <div className="font-bold text-rose-500">-₹2,400.00</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 dark:border-white/[0.06] space-y-1">
                    <div className="text-on-surface-variant text-[10px] uppercase">Food &amp; Dining</div>
                    <div className="font-bold text-on-surface text-sm">Grocery</div>
                    <div className="font-bold text-rose-500">-₹600.00</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 dark:border-white/[0.06] space-y-1">
                    <div className="text-on-surface-variant text-[10px] uppercase">Friend Debt (Sam)</div>
                    <div className="font-bold text-on-surface text-sm">Coffee Split</div>
                    <div className="font-bold text-emerald-500">+₹200.00 (Owed)</div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant/40 dark:border-white/[0.06] pt-3.5 text-xs font-jetbrains-mono text-on-surface-variant">
                  <span>Passbook Balance After Posting:</span>
                  <span className="font-bold text-on-surface text-base">₹64,150.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CORE CAPABILITIES (6 KEY FEATURES) */}
      {/* ========================================================================= */}
      <section id="features" className="py-16 md:py-24 border-t border-outline-variant/40 dark:border-white/[0.08] bg-surface-container-low/60 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-jetbrains-mono uppercase text-primary font-bold tracking-wider">
              Comprehensive Financial Control
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
              Engineered like a fine physical ledger, powered for speed.
            </h2>
            <p className="text-sm font-sans text-on-surface-variant">
              Everything you need to master your personal economy without cumbersome spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-3.5 desktop-card-hover">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-on-surface">
                Multi-Expense AI Register
              </h3>
              <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                Log multiple items in a single breath. FinChat categorizes, itemizes, and posts each entry individually to your accounts with zero friction.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-3.5 desktop-card-hover">
              <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-on-surface">
                Ruled Ledger Passbook
              </h3>
              <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                Experience authentic double-entry visual accounting. Track debits, credits, running balances, and category breakdowns with instant clarity.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-3.5 desktop-card-hover">
              <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-on-surface">
                Friend Splits &amp; Debt Tabs
              </h3>
              <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                Never lose track of who paid for dinner. Maintain running tabs for friends, see who owes whom, and record settlements in one tap.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-3.5 desktop-card-hover">
              <div className="h-11 w-11 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                <Send className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-on-surface">
                Instant Telegram Sync
              </h3>
              <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                Connect your account to @FinChatLedgerBot on Telegram. Log coffee on-the-go or check your balance right from your messaging app.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-3.5 desktop-card-hover">
              <div className="h-11 w-11 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                <Key className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-on-surface">
                Bring Your Own Key (BYOK)
              </h3>
              <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                Use your personal API keys from Groq, Gemini, or Claude. Keys are encrypted with AES-256-GCM and never exposed to the browser.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-3.5 desktop-card-hover">
              <div className="h-11 w-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <Download className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-on-surface">
                Client-Side Exports &amp; Imports
              </h3>
              <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                Export custom date-range statements as CSV, Excel (.xlsx), or PDF passbooks. Import historical bank notes with AI deduplication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. 3-STEP "HOW IT WORKS" */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-16 md:py-24 border-t border-outline-variant/40 dark:border-white/[0.08] scroll-mt-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-jetbrains-mono uppercase text-primary font-bold tracking-wider">
              Simplicity First
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
              How FinChat Works in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-3 desktop-card-hover">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-jetbrains-mono font-bold">
                STEP 01
              </span>
              <h3 className="font-display text-lg font-bold text-on-surface">Speak or Type</h3>
              <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                Tell the assistant what you bought, who you split with, or any income you earned in natural conversational language.
              </p>
            </div>

            <div className="p-6 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-3 desktop-card-hover">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-jetbrains-mono font-bold">
                STEP 02
              </span>
              <h3 className="font-display text-lg font-bold text-on-surface">Instant AI Parsing</h3>
              <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                FinChat separates amounts, matches categories, calculates friend splits, and formats clean ledger cards.
              </p>
            </div>

            <div className="p-6 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-3 desktop-card-hover">
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-jetbrains-mono font-bold">
                STEP 03
              </span>
              <h3 className="font-display text-lg font-bold text-on-surface">Passbook Posting</h3>
              <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                Your Ledger updates in real time with running totals, debt tabs, analytics graphs, and downloadable PDF statements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TELEGRAM INTEGRATION SHOWCASE */}
      {/* ========================================================================= */}
      <section id="telegram" className="py-16 md:py-24 border-t border-outline-variant/40 dark:border-white/[0.08] bg-surface-container-low/60 scroll-mt-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.08] bg-surface-container p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 desktop-card-hover">
            <div className="space-y-4 max-w-md">
              <div className="inline-flex items-center gap-2 text-xs font-jetbrains-mono uppercase text-primary font-bold">
                <Send className="h-4 w-4" />
                <span>Mobile Freedom</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
                Your Ledger in Your Pocket via Telegram
              </h2>
              <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                Walking out of a restaurant? Just send a quick text or voice note to @FinChatLedgerBot. Your web ledger syncs seamlessly in milliseconds.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigateTo("/login?tab=signup")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-xs font-jetbrains-mono font-bold text-on-primary hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                >
                  <span>Connect Telegram Bot</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Telegram simulated card */}
            <div className="w-full max-w-sm rounded-2xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container-low p-4 space-y-3 font-jetbrains-mono text-xs shadow-md">
              <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-2.5 text-[11px] text-on-surface-variant">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-on-surface">@FinChatLedgerBot</span>
              </div>
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface">
                &quot;Spent 120 on metro card&quot;
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-on-surface space-y-1">
                <div className="font-bold text-emerald-500 text-[11px] uppercase flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Recorded to Travel</span>
                </div>
                <div>Amount: -₹120.00</div>
                <div className="text-[10px] text-on-surface-variant">Balance: ₹64,030.00</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. BYOK ENGINE HIGHLIGHT */}
      {/* ========================================================================= */}
      <section id="byok" className="py-16 md:py-24 border-t border-outline-variant/40 dark:border-white/[0.08] scroll-mt-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-jetbrains-mono uppercase text-primary font-bold">
            <Key className="h-4 w-4" />
            <span>Power User Flexibility</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
            Bring Your Own AI Key
          </h2>
          <p className="text-sm font-sans text-on-surface-variant max-w-xl mx-auto leading-relaxed">
            Want to use your personal Groq, Google Gemini, or Anthropic Claude API key? FinChat supports zero-markup key configuration encrypted directly on our secure server.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3 font-jetbrains-mono text-xs">
            <span className="px-4 py-2 rounded-2xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container shadow-xs">
              Groq (Llama 3.3 70B)
            </span>
            <span className="px-4 py-2 rounded-2xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container shadow-xs">
              Google Gemini (2.5 Flash &amp; Pro)
            </span>
            <span className="px-4 py-2 rounded-2xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container shadow-xs">
              Anthropic Claude (3.5 Sonnet &amp; Haiku)
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FAQ PREVIEW */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 md:py-24 border-t border-outline-variant/40 dark:border-white/[0.08] bg-surface-container-low/60 scroll-mt-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="font-display text-3xl font-bold tracking-tight text-on-surface">
              Frequently Asked Questions
            </h2>
            <p className="text-xs font-jetbrains-mono uppercase text-on-surface-variant">
              Clear answers to common questions
            </p>
          </div>

          <div className="space-y-4 font-sans text-xs">
            <div className="p-5 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-2 desktop-card-hover">
              <h3 className="font-bold text-on-surface text-sm">Is my financial data secure?</h3>
              <p className="text-on-surface-variant leading-relaxed">
                Yes. Your records are stored in secure, access-controlled accounts. Your API keys are encrypted with AES-256-GCM. We never sell your data or serve third-party ads.
              </p>
            </div>

            <div className="p-5 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-2 desktop-card-hover">
              <h3 className="font-bold text-on-surface text-sm">Can I export my transactions anytime?</h3>
              <p className="text-on-surface-variant leading-relaxed">
                Absolutely. You can export complete statements as CSV, Excel (.xlsx), or PDF files right from the Settings page with full date range control.
              </p>
            </div>

            <div className="p-5 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container space-y-2 desktop-card-hover">
              <h3 className="font-bold text-on-surface text-sm">Do I need a paid subscription?</h3>
              <p className="text-on-surface-variant leading-relaxed">
                FinChat is completely free to start out-of-the-box. You can also plug in your own API key for unlimited personal headroom.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. BOTTOM CALL TO ACTION */}
      {/* ========================================================================= */}
      <section className="py-16 md:py-24 border-t border-outline-variant/40 dark:border-white/[0.08] text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
            Start your personal ledger today.
          </h2>
          <p className="text-sm font-sans text-on-surface-variant max-w-md mx-auto">
            Experience the clarity of a physical account register paired with modern conversational speed.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigateTo("/login?tab=signup")}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-sm font-jetbrains-mono font-bold text-on-primary transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <span>Open Free Register</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-outline-variant/40 dark:border-white/[0.08] bg-surface-container-low py-8 text-xs font-jetbrains-mono text-on-surface-variant">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-bold text-on-surface">FinChat Ledger</span>
            <span>&bull; Physical Account Register Reimagined</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => navigateTo("/login")}
              className="hover:text-on-surface transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigateTo("/login?tab=signup")}
              className="hover:text-on-surface transition-colors cursor-pointer"
            >
              Register
            </button>
            <span>&copy; {new Date().getFullYear()} FinChat</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
