"use client";

import React from "react";
import Link from "next/link";
import { format, isToday, isYesterday } from "date-fns";
import { formatCurrency } from "@/lib/currency";
import { getMobileCategoryTheme } from "@/lib/mobile-theme";
import { Transaction } from "@/types";
import { motion, useReducedMotion } from "motion/react";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface MobileRecentEntriesProps {
  transactions: Transaction[];
  currency: string;
  onDeleteTransaction?: (transaction: Transaction) => void;
  onSelectTransaction?: (transaction: Transaction) => void;
}

export function MobileRecentEntries({
  transactions,
  currency,
  onDeleteTransaction,
  onSelectTransaction,
}: MobileRecentEntriesProps) {
  const shouldReduceMotion = useReducedMotion();

  const recentTransactions = transactions.slice(0, 10);

  const formatTransactionDate = (dateVal: any) => {
    try {
      const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
      if (isToday(d)) return "Today";
      if (isYesterday(d)) return "Yesterday";
      return format(d, "MMM d");
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-3">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold tracking-[0.05em] uppercase text-md-on-surface-variant font-inter">
          Recent Entries
        </h3>
        <Link
          href="/analysis"
          className="text-xs font-semibold text-md-primary hover:underline font-inter"
        >
          View All
        </Link>
      </div>

      {/* ── Transactions List ── */}
      {recentTransactions.length === 0 ? (
        <div className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-8 text-center md-card-shadow">
          <p className="text-sm text-md-on-surface font-inter">No entries recorded yet.</p>
          <p className="text-xs text-md-on-surface-variant mt-1 font-inter">
            Tap the + button to log an expense with AI Register.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {recentTransactions.map((tx, index) => {
            const isIncome = tx.type === "income";
            const theme = getMobileCategoryTheme(tx.category);
            const amountVal = tx.userShare ?? tx.amount;
            const formattedAmount = formatCurrency(amountVal, currency);

            return (
              <motion.div
                key={tx.id || index}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.04,
                  ease: "easeOut",
                }}
                onClick={() => onSelectTransaction?.(tx)}
                className="group relative flex items-center justify-between rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-3.5 md-card-shadow transition-colors hover:border-md-outline/40 cursor-pointer"
              >
                {/* Left: 44x44px Circular Colored Icon Badge + Details */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    style={{
                      backgroundColor: theme.containerTint,
                      color: theme.iconColor,
                    }}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full shadow-inner"
                  >
                    <MaterialIcon name={theme.materialIcon} size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-md-on-surface font-inter">
                      {tx.description || theme.name}
                    </p>
                    <p className="truncate text-xs text-md-on-surface-variant font-inter mt-0.5">
                      {theme.name.split("&")[0].trim()} •{" "}
                      {formatTransactionDate(tx.date)}
                    </p>
                  </div>
                </div>

                {/* Right: JetBrains Mono Amount (Green + for income, Plain Neutral - for expense) */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`font-jetbrains-mono font-medium text-sm tabular-nums ${
                      isIncome ? "text-md-tertiary font-bold" : "text-md-on-surface"
                    }`}
                  >
                    {isIncome ? `+${formattedAmount}` : `−${formattedAmount}`}
                  </span>

                  {onDeleteTransaction && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTransaction(tx);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-md-on-surface-variant hover:text-md-error transition-opacity"
                      aria-label="Delete entry"
                    >
                      <MaterialIcon name="delete" size={18} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MobileRecentEntries;
