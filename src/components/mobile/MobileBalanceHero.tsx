"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { motion, useReducedMotion } from "motion/react";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface MobileBalanceHeroProps {
  balance: number;
  income: number;
  expense: number;
  currency: string;
  changePercentage?: number;
  savingsRate?: number;
  friendDebtNet?: number;
  onViewLedger?: () => void;
}

export function MobileBalanceHero({
  balance,
  income,
  expense,
  currency,
  changePercentage = 2.4,
  savingsRate = 0,
  friendDebtNet = 0,
  onViewLedger,
}: MobileBalanceHeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayBalance, setDisplayBalance] = useState(balance);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayBalance(balance);
      return;
    }
    // Smooth number interpolation on change (700ms easeOutCubic)
    let start = 0;
    const end = balance;
    const duration = 700;
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayBalance(start + (end - start) * easeOut);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setDisplayBalance(end);
      }
    };

    requestAnimationFrame(updateCounter);
  }, [balance, shouldReduceMotion]);

  const isNegative = balance < 0;
  const isDebtPositive = friendDebtNet > 0;
  const isDebtNegative = friendDebtNet < 0;

  return (
    <div className="space-y-3">
      {/* ── Main Hero Balance Card ── */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative overflow-hidden rounded-[24px] bg-md-surface-container-high border border-fiber-line dark:border-white/[0.08] p-5 md-hero-shadow text-md-on-surface"
      >
        {/* Soft diagonal sheen overlay */}
        <div className="absolute inset-0 md-sheen pointer-events-none" />

        {/* Translucent area-chart squiggle SVG anchored to bottom */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg
            className="absolute bottom-0 right-0 w-full h-24 opacity-30"
            viewBox="0 0 300 100"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M 0,80 Q 50,25 100,60 T 200,30 T 300,45"
              stroke="#ABC7FF"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 0,80 Q 50,25 100,60 T 200,30 T 300,45 L 300,100 L 0,100 Z"
              fill="url(#hero-chart-gradient)"
              opacity="0.2"
            />
            <defs>
              <linearGradient id="hero-chart-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ABC7FF" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ABC7FF" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="relative z-10 space-y-4">
          {/* Label + Trend Pill */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-[0.06em] uppercase text-md-on-surface-variant font-inter">
              Net Ledger Balance
            </p>
            <div className="inline-flex items-center gap-1 rounded-full bg-md-tertiary/15 px-2.5 py-0.5 text-[11px] font-semibold text-md-tertiary font-inter">
              <MaterialIcon name="trending_up" size={14} />
              <span>+{changePercentage}% vs last</span>
            </div>
          </div>

          {/* 40px/48px/700 JetBrains Mono Balance Figure */}
          <div>
            <h2
              className={`text-[36px] sm:text-[40px] leading-[44px] sm:leading-[48px] font-bold font-jetbrains-mono tracking-tight tabular-nums ${
                isNegative ? "text-md-error" : "text-md-on-surface"
              }`}
            >
              {formatCurrency(displayBalance, currency)}
            </h2>
          </div>

          {/* Adapted Action Pill Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <Link
              href="/chat"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-md-on-surface text-md-surface py-2.5 px-4 text-xs font-bold font-inter shadow-md active:scale-95 transition-transform"
            >
              <MaterialIcon name="chat" size={18} className="font-bold" />
              <span>AI Register</span>
            </Link>

            <button
              type="button"
              onClick={onViewLedger}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-md-surface-variant text-md-on-surface py-2.5 px-4 text-xs font-bold font-inter border border-fiber-line dark:border-white/[0.04] active:scale-95 transition-transform hover:bg-md-surface-bright"
            >
              <MaterialIcon name="pie_chart" size={18} />
              <span>Categories</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Income & Expense Stat Cards (Row 1) ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Income Card */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
          className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-md-tertiary-container/30 text-md-tertiary">
              <MaterialIcon name="arrow_downward" size={16} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
              This Month Income
            </span>
          </div>
          <p className="text-xl font-bold font-jetbrains-mono tracking-tight text-md-on-surface tabular-nums">
            {formatCurrency(income, currency)}
          </p>
        </motion.div>

        {/* Expense Card */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
          className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-md-error-container/30 text-md-error">
              <MaterialIcon name="arrow_upward" size={16} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
              This Month Spend
            </span>
          </div>
          <p className="text-xl font-bold font-jetbrains-mono tracking-tight text-md-on-surface tabular-nums">
            {formatCurrency(expense, currency)}
          </p>
        </motion.div>
      </div>

      {/* ── Savings Rate & Friend Debt Net Stat Cards (Row 2) ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Savings Rate Card */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
          className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-md-primary-container/30 text-md-primary">
              <MaterialIcon name="savings" size={16} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter truncate">
              Savings Rate
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <p className="text-xl font-bold font-jetbrains-mono tracking-tight text-md-primary tabular-nums">
              {savingsRate}%
            </p>
            <span className="text-[10px] text-md-on-surface-variant font-inter">
              of income
            </span>
          </div>
        </motion.div>

        {/* Friend Debt Net Card */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
          className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                isDebtPositive
                  ? "bg-md-tertiary-container/30 text-md-tertiary"
                  : isDebtNegative
                  ? "bg-md-error-container/30 text-md-error"
                  : "bg-md-surface-container-high text-md-on-surface-variant"
              }`}
            >
              <MaterialIcon
                name={isDebtPositive ? "call_received" : isDebtNegative ? "call_made" : "check_circle"}
                size={16}
              />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter truncate">
              Friend Debt Net
            </span>
          </div>
          <p
            className={`text-xl font-bold font-jetbrains-mono tracking-tight tabular-nums truncate ${
              isDebtPositive
                ? "text-md-tertiary"
                : isDebtNegative
                ? "text-md-error"
                : "text-md-on-surface"
            }`}
          >
            {isDebtPositive ? "+" : isDebtNegative ? "−" : ""}
            {formatCurrency(Math.abs(friendDebtNet), currency)}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default MobileBalanceHero;
