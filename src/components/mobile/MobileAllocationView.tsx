"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/currency";
import { getMobileCategoryTheme } from "@/lib/mobile-theme";
import { Transaction } from "@/types";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { isSameMonth, subMonths, format } from "date-fns";

type TimeFrame = "thisMonth" | "lastMonth" | "allTime";

interface MobileAllocationViewProps {
  transactions: Transaction[];
  currency: string;
  onBack?: () => void;
}

export function MobileAllocationView({
  transactions,
  currency,
  onBack,
}: MobileAllocationViewProps) {
  const shouldReduceMotion = useReducedMotion();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("thisMonth");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  // Filter transactions by timeframe
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = t.date instanceof Date ? t.date : new Date(t.date as any);
      if (timeFrame === "thisMonth") {
        return isSameMonth(d, now);
      }
      if (timeFrame === "lastMonth") {
        return isSameMonth(d, subMonths(now, 1));
      }
      return true;
    });
  }, [transactions, timeFrame, now]);

  // Calculate category totals and percentages for the selected timeframe
  const { categoryData, totalExpense, topMerchant } = useMemo(() => {
    const expenseTransactions = filteredTransactions.filter((t) => t.type === "expense");
    const total = expenseTransactions.reduce(
      (sum, t) => sum + (t.userShare ?? t.amount),
      0
    );

    const categoryMap: Record<string, { amount: number; count: number }> = {};
    const merchantMap: Record<string, { amount: number; count: number }> = {};

    expenseTransactions.forEach((t) => {
      const cat = t.category || "Miscellaneous";
      const amt = t.userShare ?? t.amount;
      if (!categoryMap[cat]) {
        categoryMap[cat] = { amount: 0, count: 0 };
      }
      categoryMap[cat].amount += amt;
      categoryMap[cat].count += 1;

      const desc = t.description?.trim();
      if (desc) {
        if (!merchantMap[desc]) {
          merchantMap[desc] = { amount: 0, count: 0 };
        }
        merchantMap[desc].amount += amt;
        merchantMap[desc].count += 1;
      }
    });

    const sortedCategories = Object.entries(categoryMap)
      .map(([name, val]) => ({
        name,
        amount: val.amount,
        count: val.count,
        percentage: total > 0 ? Math.round((val.amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    let topM: { name: string; amount: number; count: number } | null = null;
    const sortedMerchants = Object.entries(merchantMap).sort(
      (a, b) => b[1].amount - a[1].amount
    );
    if (sortedMerchants.length > 0) {
      topM = {
        name: sortedMerchants[0][0],
        amount: sortedMerchants[0][1].amount,
        count: sortedMerchants[0][1].count,
      };
    }

    return {
      categoryData: sortedCategories,
      totalExpense: total,
      topMerchant: topM,
    };
  }, [filteredTransactions]);

  // Category drill-down transactions
  const drillDownTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return filteredTransactions.filter(
      (t) => t.type === "expense" && (t.category || "Miscellaneous") === selectedCategory
    );
  }, [filteredTransactions, selectedCategory]);

  // Donut SVG Calculations
  const radius = 64;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke offsets for each category segment
  const segments = useMemo(() => {
    let accumulatedAngle = 0;
    return categoryData.map((cat) => {
      const theme = getMobileCategoryTheme(cat.name);
      const ratio = totalExpense > 0 ? cat.amount / totalExpense : 0;
      const strokeDasharray = `${ratio * circumference} ${circumference}`;
      const strokeDashoffset = -accumulatedAngle * circumference;
      accumulatedAngle += ratio;

      return {
        ...cat,
        color: theme.flatBadge,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [categoryData, totalExpense, circumference]);

  const selectedCategoryTheme = selectedCategory ? getMobileCategoryTheme(selectedCategory) : null;

  return (
    <div className="space-y-4 pb-20">
      {/* ── Top Header with Timeframe Tabs ── */}
      <div className="flex items-center justify-between px-1">
        {selectedCategory ? (
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-1.5 text-sm font-semibold font-inter text-md-on-surface hover:text-white"
          >
            <MaterialIcon name="arrow_back" size={18} />
            <span>All Categories</span>
          </button>
        ) : onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold font-inter text-md-on-surface hover:text-white"
          >
            <MaterialIcon name="arrow_back" size={18} />
            <span>Overview</span>
          </button>
        ) : (
          <h2 className="text-base font-bold tracking-tight text-md-on-surface font-inter">
            Categories
          </h2>
        )}

        {/* Time Frame Selector */}
        <div className="flex rounded-full bg-md-surface-container-high border border-fiber-line dark:border-white/[0.06] p-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setTimeFrame("thisMonth")}
            className={`px-2.5 py-1 rounded-full transition-all font-inter ${
              timeFrame === "thisMonth"
                ? "bg-md-surface-bright text-md-on-surface font-bold shadow-xs"
                : "text-md-on-surface-variant hover:text-md-on-surface"
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => setTimeFrame("lastMonth")}
            className={`px-2.5 py-1 rounded-full transition-all font-inter ${
              timeFrame === "lastMonth"
                ? "bg-md-surface-bright text-md-on-surface font-bold shadow-xs"
                : "text-md-on-surface-variant hover:text-md-on-surface"
            }`}
          >
            Last Month
          </button>
          <button
            type="button"
            onClick={() => setTimeFrame("allTime")}
            className={`px-2.5 py-1 rounded-full transition-all font-inter ${
              timeFrame === "allTime"
                ? "bg-md-surface-bright text-md-on-surface font-bold shadow-xs"
                : "text-md-on-surface-variant hover:text-md-on-surface"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedCategory ? (
          /* ── Drill-down Transaction List ── */
          <motion.div
            key="drill-down"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between rounded-[24px] bg-md-surface-container-high border border-fiber-line dark:border-white/[0.08] p-4 md-hero-shadow">
              <div className="flex items-center gap-3">
                <div
                  style={{
                    backgroundColor: selectedCategoryTheme?.containerTint,
                    color: selectedCategoryTheme?.iconColor,
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full shadow-inner"
                >
                  <MaterialIcon name={selectedCategoryTheme?.materialIcon || "category"} size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-md-on-surface font-inter">
                    {selectedCategoryTheme?.name || selectedCategory}
                  </h3>
                  <p className="text-xs text-md-on-surface-variant font-inter mt-0.5">
                    {drillDownTransactions.length} entries recorded
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold font-jetbrains-mono text-md-on-surface tabular-nums">
                  {formatCurrency(
                    drillDownTransactions.reduce((sum, t) => sum + (t.userShare ?? t.amount), 0),
                    currency
                  )}
                </p>
                <span className="text-[10px] uppercase font-bold text-md-on-surface-variant font-inter">
                  Category Total
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {drillDownTransactions.length === 0 ? (
                <div className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-6 text-center text-xs text-md-on-surface-variant font-inter">
                  No transactions found in this timeframe.
                </div>
              ) : (
                drillDownTransactions.map((tx, idx) => {
                  const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date as any);
                  const amt = tx.userShare ?? tx.amount;

                  return (
                    <motion.div
                      key={tx.id || idx}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className="flex items-center justify-between rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-3.5 md-card-shadow"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-semibold text-md-on-surface font-inter truncate">
                          {tx.description || selectedCategory}
                        </p>
                        <p className="text-xs text-md-on-surface-variant font-inter mt-0.5">
                          {format(txDate, "MMM dd, yyyy")}
                        </p>
                      </div>
                      <span className="font-jetbrains-mono font-bold text-sm text-md-error tabular-nums flex-shrink-0">
                        −{formatCurrency(amt, currency)}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : (
          /* ── Main Category Allocation View ── */
          <motion.div
            key="category-main"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* ── Thin Ring Donut Card ── */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative overflow-hidden rounded-[24px] bg-md-surface-container-high border border-fiber-line dark:border-white/[0.08] p-6 md-hero-shadow flex flex-col items-center justify-center text-center"
            >
              {/* Soft diagonal sheen overlay */}
              <div className="absolute inset-0 md-sheen pointer-events-none" />

              <div className="relative flex items-center justify-center h-48 w-48 my-1 z-10">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 160 160">
                  {/* Background ring */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke="currentColor"
                    className="text-fiber-line dark:text-white/[0.08]"
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {/* Category segments with rounded caps */}
                  {segments.map((seg, idx) => (
                    <circle
                      key={seg.name + idx}
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke={seg.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      className="transition-all duration-700 ease-out cursor-pointer hover:opacity-80"
                      onClick={() => setSelectedCategory(seg.name)}
                    />
                  ))}
                </svg>

                {/* Centered Total Figure in JetBrains Mono */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold tracking-tight text-md-on-surface font-jetbrains-mono tabular-nums">
                    {formatCurrency(totalExpense, currency)}
                  </span>
                  <span className="text-[11px] font-semibold text-md-on-surface-variant font-inter uppercase tracking-wider mt-0.5">
                    Total Spent
                  </span>
                </div>
              </div>

              <p className="text-xs text-md-on-surface-variant mt-2 font-medium font-inter z-10">
                {timeFrame === "thisMonth"
                  ? "Spend this Month"
                  : timeFrame === "lastMonth"
                  ? "Spend last Month"
                  : "All-time Spend"}
              </p>
            </motion.div>

            {/* ── Category Breakdown Cards with 3px Left Accent Bars ── */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold tracking-[0.05em] uppercase text-md-on-surface-variant font-inter">
                  Category Breakdown
                </h3>
                <span className="text-[11px] text-md-on-surface-variant font-inter">
                  Tap to drill down
                </span>
              </div>

              {categoryData.length === 0 ? (
                <div className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-6 text-center text-md-on-surface-variant text-xs font-inter md-card-shadow">
                  No categorized expenses recorded for this period.
                </div>
              ) : (
                categoryData.map((cat, idx) => {
                  const theme = getMobileCategoryTheme(cat.name);

                  return (
                    <motion.div
                      key={cat.name}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: idx * 0.04,
                        ease: "easeOut",
                      }}
                      onClick={() => setSelectedCategory(cat.name)}
                      className="relative overflow-hidden rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-3.5 md-card-shadow flex items-center justify-between cursor-pointer hover:border-md-outline/30 active:scale-95 transition-all"
                    >
                      {/* 3px Colored Left Accent Bar */}
                      <div
                        style={{ backgroundColor: theme.flatBadge }}
                        className="absolute left-0 top-0 bottom-0 w-[3px]"
                      />

                      {/* Circular Icon badge + Category title */}
                      <div className="flex items-center gap-3 pl-2 min-w-0">
                        <div
                          style={{
                            backgroundColor: theme.containerTint,
                            color: theme.iconColor,
                          }}
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full shadow-inner"
                        >
                          <MaterialIcon name={theme.materialIcon} size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-md-on-surface font-inter truncate">
                            {theme.name.split("&")[0].trim()}
                          </p>
                          <p className="text-xs text-md-on-surface-variant font-inter mt-0.5">
                            {cat.count} {cat.count === 1 ? "Transaction" : "Transactions"}
                          </p>
                        </div>
                      </div>

                      {/* Amount + Percentage pill */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="font-jetbrains-mono font-bold text-sm text-md-on-surface tabular-nums">
                          {formatCurrency(cat.amount, currency)}
                        </span>
                        <span
                          style={{
                            backgroundColor: theme.containerTint,
                            color: theme.iconColor,
                          }}
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold font-inter"
                        >
                          {cat.percentage}%
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* ── Top Merchant Card ── */}
            {topMerchant && (
              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-bold tracking-[0.05em] uppercase text-md-on-surface-variant font-inter px-1">
                  Top Merchant
                </h3>
                <div className="flex items-center justify-between rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                      <MaterialIcon name="storefront" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-md-on-surface font-inter truncate">
                        {topMerchant.name}
                      </p>
                      <p className="text-xs text-md-on-surface-variant font-inter mt-0.5">
                        {topMerchant.count} Transactions
                      </p>
                    </div>
                  </div>
                  <span className="font-jetbrains-mono font-bold text-sm text-md-on-surface tabular-nums">
                    {formatCurrency(topMerchant.amount, currency)}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MobileAllocationView;

