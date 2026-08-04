"use client";

import React from "react";
import { WifiOff, RefreshCw, BookOpen } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <main className="min-h-screen bg-paper-bg flex flex-col items-center justify-center p-4 sm:p-6 text-ink-text selection:bg-stamp-indigo/20">
      <div className="max-w-md w-full bg-paper-card border border-fiber-line shadow-ledger-sm rounded-lg p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Ledger Red Margin Indicator */}
        <div className="absolute top-0 bottom-0 left-4 w-0.5 bg-rule-red/40 hidden sm:block" />

        {/* Ink-stamp badge (greyed out) */}
        <div className="w-16 h-16 rounded-full bg-paper-rule/60 border border-fiber-line flex items-center justify-center mx-auto mb-5 text-ink-muted">
          <WifiOff className="w-8 h-8 opacity-70" />
        </div>

        {/* Header with Ledger typography */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-stamp-indigo" />
          <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
            FinChat Offline Register
          </span>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-ink-text mb-3">
          You&apos;re Offline
        </h1>

        <p className="text-sm sm:text-base text-ink-muted leading-relaxed mb-6">
          Your last-loaded data is still here — new entries will automatically
          sync with your ledger once you&apos;re back online.
        </p>

        {/* Ruled separation line */}
        <div className="h-px bg-paper-rule my-6" />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleRetry}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-stamp-indigo hover:bg-stamp-indigo-hover text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-stamp-indigo/40"
          >
            <RefreshCw className="w-4 h-4" />
            Check Connection
          </button>
          <Link
            href="/chat"
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-paper-rule/50 hover:bg-paper-rule text-ink-text border border-fiber-line rounded-md text-sm font-medium transition-colors"
          >
            Back to Chat
          </Link>
        </div>
      </div>
    </main>
  );
}
