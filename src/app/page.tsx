"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Smartphone,
  ChevronRight,
  CheckCircle2,
  Lock,
  FileSpreadsheet,
  FileText,
  Loader2,
  Menu,
  X,
  HelpCircle,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-bg">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-text">
          <Loader2 className="h-4 w-4 animate-spin text-stamp-indigo" />
          Loading FinChat Ledger...
        </div>
      </div>
    );
  }

  // If user is authenticated, avoid flashing landing page while redirect executes
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper-bg text-ink-text selection:bg-stamp-indigo/20 font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 border-b border-fiber-line bg-paper-bg/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-stamp-indigo text-[#EDE7D6] font-display font-bold text-base shadow-sm">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xl font-bold tracking-tight text-ink-text">
                FinChat
              </span>
              <span className="text-[10px] font-mono uppercase text-muted-text px-1.5 py-0.2 border border-fiber-line rounded-[3px] bg-card-bg">
                Ledger
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-wider text-muted-text">
            <a href="#features" className="hover:text-ink-text transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-ink-text transition-colors">
              How It Works
            </a>
            <a href="#telegram" className="hover:text-ink-text transition-colors">
              Telegram Sync
            </a>
            <a href="#byok" className="hover:text-ink-text transition-colors">
              BYOK Engine
            </a>
            <a href="#faq" className="hover:text-ink-text transition-colors">
              FAQ
            </a>
          </nav>

          {/* Header CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-xs font-mono text-ink-text hover:text-stamp-indigo transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login?tab=signup"
              className="px-4 py-2 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-xs font-mono font-bold text-[#EDE7D6] transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>Open Register</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-ink-text hover:text-stamp-indigo"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-fiber-line bg-card-bg px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-2 text-xs font-mono uppercase text-muted-text">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-ink-text"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-ink-text"
              >
                How It Works
              </a>
              <a
                href="#telegram"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-ink-text"
              >
                Telegram Sync
              </a>
              <a
                href="#byok"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-ink-text"
              >
                BYOK Engine
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-ink-text"
              >
                FAQ
              </a>
            </nav>
            <div className="pt-2 border-t border-fiber-line flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full text-center py-2 text-xs font-mono border border-fiber-line rounded-[4px] bg-paper-bg text-ink-text"
              >
                Sign In
              </Link>
              <Link
                href="/login?tab=signup"
                className="w-full text-center py-2 text-xs font-mono font-bold bg-stamp-indigo text-[#EDE7D6] rounded-[4px]"
              >
                Open Free Register
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Subtle ruled background grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#12201A_1px,transparent_1px)] [background-size:32px_32px] opacity-5 pointer-events-none" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-fiber-line bg-card-bg px-3.5 py-1 text-[11px] font-mono text-muted-text uppercase tracking-wider shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-stamp-emerald" />
            The Authentic Ruled Ledger Reimagined
          </div>

          {/* Main Title */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink-text leading-[1.15]">
            The conversational ledger for people who{" "}
            <span className="text-stamp-indigo italic font-serif underline decoration-rule-red/40 decoration-wavy decoration-2">
              hate budgeting apps.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-base sm:text-lg font-sans text-muted-text leading-relaxed">
            Ditch the endless form dropdowns and messy spreadsheets. Just write or speak what you spent, who you split with, or what you earned in plain natural language.
          </p>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login?tab=signup"
              className="w-full sm:w-auto px-6 py-3.5 rounded-[6px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-sm font-mono font-bold text-[#EDE7D6] transition-all shadow-md flex items-center justify-center gap-2 group"
            >
              <span>Open Your Free Ledger</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-6 py-3.5 rounded-[6px] border border-fiber-line bg-card-bg hover:bg-paper-bg text-sm font-mono text-ink-text transition-colors shadow-xs"
            >
              See Live Register Demo
            </a>
          </div>

          {/* Trust points */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs font-mono text-muted-text">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-stamp-emerald" /> 100% Client-Side Exports
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-stamp-emerald" /> AES-256 Encrypted BYOK
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-stamp-emerald" /> No Ad Tracking or Data Selling
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. HERO INTERACTIVE LEDGER SHOWCASE */}
        {/* ========================================================================= */}
        <div id="demo" className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-14">
          <div className="rounded-[10px] border-2 border-fiber-line bg-card-bg shadow-xl overflow-hidden">
            {/* Top Passbook Titlebar */}
            <div className="flex items-center justify-between border-b border-fiber-line bg-paper-bg px-4 py-2.5 text-[11px] font-mono text-muted-text">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rule-red/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-passbook-gold/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-stamp-emerald/70" />
                <span className="ml-2 font-bold text-ink-text uppercase">
                  FOLIO 2026-08 • REGISTER DEMO
                </span>
              </div>
              <span className="text-stamp-emerald font-bold uppercase tracking-wider">
                AUTO-STAMPED
              </span>
            </div>

            {/* Simulated Ruled Register Body */}
            <div className="p-5 sm:p-8 bg-paper-bg/60 space-y-6">
              {/* User Message */}
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-[4px] bg-stamp-indigo text-[#EDE7D6] flex items-center justify-center text-xs font-mono font-bold shrink-0">
                  YOU
                </div>
                <div className="rounded-[6px] bg-card-bg border border-fiber-line p-3 text-sm font-sans text-ink-text shadow-xs max-w-md">
                  &quot;Paid 2400 for electricity bill, 600 for grocery, and Sam owes 200 for coffee&quot;
                </div>
              </div>

              {/* Bot Response Stamp & Breakdown */}
              <div className="space-y-3 pl-0 sm:pl-10">
                <div className="flex items-center gap-2 text-xs font-mono uppercase text-stamp-indigo font-bold">
                  <Sparkles className="h-4 w-4" />
                  <span>3 Transactions Extracted &amp; Posted to Passbook</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
                  <div className="p-3 rounded-[6px] bg-card-bg border border-fiber-line space-y-1">
                    <div className="text-muted-text text-[10px] uppercase">Bills &amp; Utilities</div>
                    <div className="font-bold text-ink-text text-sm">Electricity Bill</div>
                    <div className="font-bold text-rule-red">-₹2,400.00</div>
                  </div>

                  <div className="p-3 rounded-[6px] bg-card-bg border border-fiber-line space-y-1">
                    <div className="text-muted-text text-[10px] uppercase">Food &amp; Dining</div>
                    <div className="font-bold text-ink-text text-sm">Grocery</div>
                    <div className="font-bold text-rule-red">-₹600.00</div>
                  </div>

                  <div className="p-3 rounded-[6px] bg-card-bg border border-fiber-line space-y-1">
                    <div className="text-muted-text text-[10px] uppercase">Friend Debt (Sam)</div>
                    <div className="font-bold text-ink-text text-sm">Coffee Split</div>
                    <div className="font-bold text-stamp-emerald">+₹200.00 (Owed)</div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-fiber-line pt-3 text-xs font-mono text-muted-text">
                  <span>Passbook Balance After Posting:</span>
                  <span className="font-bold text-ink-text text-sm">₹64,150.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CORE CAPABILITIES (7 FEATURES) */}
      {/* ========================================================================= */}
      <section id="features" className="py-16 md:py-24 border-t border-fiber-line bg-card-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase text-stamp-indigo font-bold tracking-wider">
              Comprehensive Financial Control
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink-text">
              Engineered like a fine physical ledger, powered for speed.
            </h2>
            <p className="text-sm font-sans text-muted-text">
              Everything you need to master your personal economy without cumbersome spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-[8px] border border-fiber-line bg-paper-bg space-y-3 hover:border-stamp-indigo/50 transition-colors">
              <div className="h-10 w-10 rounded-[6px] bg-stamp-indigo/10 border border-stamp-indigo/20 flex items-center justify-center text-stamp-indigo">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink-text">
                Multi-Expense AI Register
              </h3>
              <p className="text-xs font-sans text-muted-text leading-relaxed">
                Log multiple items in a single breath. FinChat categorizes, itemizes, and posts each entry individually to your accounts with zero friction.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-[8px] border border-fiber-line bg-paper-bg space-y-3 hover:border-stamp-indigo/50 transition-colors">
              <div className="h-10 w-10 rounded-[6px] bg-stamp-indigo/10 border border-stamp-indigo/20 flex items-center justify-center text-stamp-indigo">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink-text">
                Ruled Ledger Passbook
              </h3>
              <p className="text-xs font-sans text-muted-text leading-relaxed">
                Experience authentic double-entry visual accounting. Track debits, credits, running balances, and category breakdowns with instant clarity.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-[8px] border border-fiber-line bg-paper-bg space-y-3 hover:border-stamp-indigo/50 transition-colors">
              <div className="h-10 w-10 rounded-[6px] bg-stamp-indigo/10 border border-stamp-indigo/20 flex items-center justify-center text-stamp-indigo">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink-text">
                Friend Splits &amp; Debt Tabs
              </h3>
              <p className="text-xs font-sans text-muted-text leading-relaxed">
                Never lose track of who paid for dinner. Maintain running tabs for friends, see who owes whom, and record settlements in one tap.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-[8px] border border-fiber-line bg-paper-bg space-y-3 hover:border-stamp-indigo/50 transition-colors">
              <div className="h-10 w-10 rounded-[6px] bg-stamp-indigo/10 border border-stamp-indigo/20 flex items-center justify-center text-stamp-indigo">
                <Send className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink-text">
                Instant Telegram Sync
              </h3>
              <p className="text-xs font-sans text-muted-text leading-relaxed">
                Connect your account to @FinChatLedgerBot on Telegram. Log coffee on-the-go or check your balance right from your messaging app.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-[8px] border border-fiber-line bg-paper-bg space-y-3 hover:border-stamp-indigo/50 transition-colors">
              <div className="h-10 w-10 rounded-[6px] bg-stamp-indigo/10 border border-stamp-indigo/20 flex items-center justify-center text-stamp-indigo">
                <Key className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink-text">
                Bring Your Own Key (BYOK)
              </h3>
              <p className="text-xs font-sans text-muted-text leading-relaxed">
                Use your personal API keys from Groq, Gemini, or Claude. Keys are encrypted with AES-256-GCM and never exposed to the browser.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-[8px] border border-fiber-line bg-paper-bg space-y-3 hover:border-stamp-indigo/50 transition-colors">
              <div className="h-10 w-10 rounded-[6px] bg-stamp-indigo/10 border border-stamp-indigo/20 flex items-center justify-center text-stamp-indigo">
                <Download className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-ink-text">
                Client-Side Exports
              </h3>
              <p className="text-xs font-sans text-muted-text leading-relaxed">
                Export custom date-range statements as CSV, Excel (.xlsx), or crisp PDF passbooks directly within your browser. Nothing touches third-party storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. 3-STEP "HOW IT WORKS" */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-16 md:py-24 border-t border-fiber-line">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-mono uppercase text-stamp-indigo font-bold tracking-wider">
              Simplicity First
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink-text">
              How FinChat Works in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 border-t-2 border-stamp-indigo pt-4">
              <span className="text-xs font-mono font-bold text-stamp-indigo">STEP 01</span>
              <h3 className="font-display text-lg font-bold text-ink-text">Speak or Type</h3>
              <p className="text-xs font-sans text-muted-text leading-relaxed">
                Tell the assistant what you bought, who you split with, or any income you earned in natural words.
              </p>
            </div>

            <div className="space-y-3 border-t-2 border-stamp-indigo pt-4">
              <span className="text-xs font-mono font-bold text-stamp-indigo">STEP 02</span>
              <h3 className="font-display text-lg font-bold text-ink-text">Instant Parsing</h3>
              <p className="text-xs font-sans text-muted-text leading-relaxed">
                FinChat separates amounts, matches categories, calculates friend splits, and formats the transaction card.
              </p>
            </div>

            <div className="space-y-3 border-t-2 border-stamp-indigo pt-4">
              <span className="text-xs font-mono font-bold text-stamp-indigo">STEP 03</span>
              <h3 className="font-display text-lg font-bold text-ink-text">Passbook Posting</h3>
              <p className="text-xs font-sans text-muted-text leading-relaxed">
                Your Ledger updates in real time with running totals, debt tabs, and downloadable PDF statements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TELEGRAM INTEGRATION SHOWCASE */}
      {/* ========================================================================= */}
      <section id="telegram" className="py-16 md:py-24 border-t border-fiber-line bg-card-bg">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[10px] border border-fiber-line bg-paper-bg p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-md">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-stamp-indigo font-bold">
                <Send className="h-4 w-4" />
                <span>Mobile Freedom</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
                Your Ledger in Your Pocket via Telegram
              </h2>
              <p className="text-xs font-sans text-muted-text leading-relaxed">
                Walking out of a restaurant? Just send a quick text or voice note to @FinChatLedgerBot. Your web ledger syncs seamlessly in milliseconds.
              </p>
              <div className="pt-2">
                <Link
                  href="/login?tab=signup"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-stamp-indigo text-xs font-mono font-bold text-[#EDE7D6] hover:bg-stamp-indigo/90 transition-colors"
                >
                  <span>Connect Telegram Bot</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Telegram simulated card */}
            <div className="w-full max-w-sm rounded-[8px] border border-fiber-line bg-card-bg p-4 space-y-3 font-mono text-xs shadow-md">
              <div className="flex items-center gap-2 border-b border-fiber-line pb-2 text-[10px] text-muted-text">
                <span className="h-2 w-2 rounded-full bg-stamp-emerald" />
                <span>@FinChatLedgerBot</span>
              </div>
              <div className="p-2.5 rounded-[4px] bg-paper-bg border border-fiber-line text-ink-text">
                &quot;Spent 120 on metro card&quot;
              </div>
              <div className="p-2.5 rounded-[4px] bg-stamp-emerald/10 border border-stamp-emerald/30 text-ink-text space-y-1">
                <div className="font-bold text-stamp-emerald text-[10px] uppercase">
                  ✓ Recorded to Travel
                </div>
                <div>Amount: -₹120.00</div>
                <div className="text-[10px] text-muted-text">Balance: ₹64,030.00</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. BYOK ENGINE HIGHLIGHT */}
      {/* ========================================================================= */}
      <section id="byok" className="py-16 md:py-24 border-t border-fiber-line">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-stamp-indigo font-bold">
            <Key className="h-4 w-4" />
            <span>Power User Flexibility</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink-text">
            Bring Your Own AI Key
          </h2>
          <p className="text-sm font-sans text-muted-text max-w-xl mx-auto leading-relaxed">
            Want to use your personal Groq, Google Gemini, or Anthropic Claude API key? FinChat supports zero-markup key configuration encrypted directly on our secure server.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3 font-mono text-xs">
            <span className="px-3 py-1.5 rounded-[4px] border border-fiber-line bg-card-bg">
              Groq (Llama 3.3 70B)
            </span>
            <span className="px-3 py-1.5 rounded-[4px] border border-fiber-line bg-card-bg">
              Google Gemini (2.5 Flash &amp; Pro)
            </span>
            <span className="px-3 py-1.5 rounded-[4px] border border-fiber-line bg-card-bg">
              Anthropic Claude (3.5 Sonnet &amp; Haiku)
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FAQ PREVIEW */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 md:py-24 border-t border-fiber-line bg-card-bg">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-text">
              Frequently Asked Questions
            </h2>
            <p className="text-xs font-mono uppercase text-muted-text">
              Clear answers to common questions
            </p>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div className="p-4 rounded-[6px] border border-fiber-line bg-paper-bg space-y-1.5">
              <h3 className="font-bold text-ink-text">Is my financial data secure?</h3>
              <p className="text-muted-text leading-relaxed">
                Yes. Your records are stored in secure, access-controlled accounts. Your API keys are encrypted with AES-256-GCM. We never sell your data or serve third-party ads.
              </p>
            </div>

            <div className="p-4 rounded-[6px] border border-fiber-line bg-paper-bg space-y-1.5">
              <h3 className="font-bold text-ink-text">Can I export my transactions anytime?</h3>
              <p className="text-muted-text leading-relaxed">
                Absolutely. You can export complete statements as CSV, Excel (.xlsx), or PDF files right from the Settings page with full date range control.
              </p>
            </div>

            <div className="p-4 rounded-[6px] border border-fiber-line bg-paper-bg space-y-1.5">
              <h3 className="font-bold text-ink-text">Do I need a paid subscription?</h3>
              <p className="text-muted-text leading-relaxed">
                FinChat is completely free to start out-of-the-box. You can also plug in your own API key for infinite personal headroom.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. BOTTOM CALL TO ACTION */}
      {/* ========================================================================= */}
      <section className="py-16 md:py-20 border-t border-fiber-line bg-paper-bg text-center">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink-text">
            Start your personal ledger today.
          </h2>
          <p className="text-sm font-sans text-muted-text max-w-md mx-auto">
            Experience the clarity of a physical account register paired with modern conversational speed.
          </p>
          <div className="pt-2">
            <Link
              href="/login?tab=signup"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[6px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-sm font-mono font-bold text-[#EDE7D6] transition-all shadow-md"
            >
              <span>Open Free Register</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-fiber-line bg-card-bg py-8 text-xs font-mono text-muted-text">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-stamp-indigo" />
            <span className="font-bold text-ink-text">FinChat Ledger</span>
            <span>&bull; Physical Account Register Reimagined</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-ink-text transition-colors">
              Sign In
            </Link>
            <Link href="/login?tab=signup" className="hover:text-ink-text transition-colors">
              Register
            </Link>
            <span>&copy; {new Date().getFullYear()} FinChat</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
