"use client";

import React from "react";
import { formatCurrency } from "@/lib/currency";
import { getMobileCategoryTheme } from "@/lib/mobile-theme";
import { motion, useReducedMotion } from "motion/react";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface CategorySummary {
  category: string;
  amount: number;
  count: number;
}

interface MobileFeatureCardsProps {
  categorySummaries: CategorySummary[];
  currency: string;
  onSelectCategory?: (category: string) => void;
}

export function MobileFeatureCards({
  categorySummaries,
  currency,
  onSelectCategory,
}: MobileFeatureCardsProps) {
  const shouldReduceMotion = useReducedMotion();

  // If no transactions yet, show default curated preview cards
  const displayItems =
    categorySummaries.length > 0
      ? categorySummaries.slice(0, 5)
      : [
          { category: "Food & Dining", amount: 450, count: 12 },
          { category: "Travel", amount: 1200, count: 4 },
          { category: "Groceries", amount: 230, count: 8 },
          { category: "Health", amount: 180, count: 3 },
        ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold tracking-[0.05em] uppercase text-md-on-surface-variant font-inter">
          Category Cards
        </h3>
        <span className="text-[11px] text-md-on-surface-variant/70 font-inter">
          Swipe or tap
        </span>
      </div>

      {/* Horizontal snap scroll of feature gradient cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 no-scrollbar snap-x snap-mandatory">
        {displayItems.map((item, index) => {
          const theme = getMobileCategoryTheme(item.category);

          return (
            <motion.div
              key={item.category + index}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              initial={shouldReduceMotion ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.35,
                delay: index * 0.05,
                ease: "easeOut",
              }}
              onClick={() => onSelectCategory?.(item.category)}
              style={{ background: theme.gradient }}
              className="relative min-w-[170px] max-w-[200px] flex-shrink-0 snap-start cursor-pointer overflow-hidden rounded-[24px] p-4 text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] border border-white/10 active:scale-95 transition-transform"
            >
              {/* Soft diagonal sheen overlay */}
              <div className="absolute inset-0 md-sheen pointer-events-none" />

              {/* Background watermark icon */}
              <div className="absolute -bottom-2 -right-2 opacity-15 pointer-events-none">
                <MaterialIcon name={theme.materialIcon} size={84} fill={true} />
              </div>

              <div className="relative z-10 flex flex-col justify-between h-28">
                {/* Top: Icon + Name & Count */}
                <div className="flex items-start justify-between gap-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                    <MaterialIcon name={theme.materialIcon} size={18} fill={true} />
                  </div>
                  <span className="text-[10px] font-semibold font-inter text-white/80 bg-black/20 px-2 py-0.5 rounded-full">
                    {item.count} {item.count === 1 ? "entry" : "entries"}
                  </span>
                </div>

                {/* Bottom: Name & Amount */}
                <div className="space-y-0.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/90 font-inter truncate">
                    {theme.name.split("&")[0].trim()}
                  </p>
                  <p className="text-lg font-bold tracking-tight text-white font-jetbrains-mono tabular-nums">
                    {formatCurrency(item.amount, currency)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default MobileFeatureCards;
