"use client";

import React, { useMemo } from "react";
import { formatCurrency } from "@/lib/currency";

interface LogStampProps {
  amount: number;
  category: string;
  type?: "expense" | "income";
  currency?: string;
  delayMs?: number;
  rotationDeg?: number;
}

export const LogStamp: React.FC<LogStampProps> = ({
  amount,
  category,
  type = "expense",
  currency = "INR",
  delayMs = 0,
  rotationDeg,
}) => {
  // Deterministic or randomized slight rotation between -3deg and -6deg
  const deg = useMemo(() => {
    if (typeof rotationDeg === "number") return rotationDeg;
    // slight pseudo-random angle based on amount and category name
    const hash = (category.length * 7 + Math.floor(amount)) % 4;
    return -3 - hash;
  }, [rotationDeg, amount, category]);

  const isExpense = type === "expense";
  const formattedAmt = formatCurrency(amount, currency);

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold tracking-wider uppercase border-2 rounded-[4px] shadow-sm select-none animate-stamp"
      style={
        {
          "--stamp-deg": `${deg}deg`,
          animationDelay: `${delayMs}ms`,
          color: isExpense ? "var(--rule-red)" : "var(--passbook-gold)",
          borderColor: isExpense ? "var(--rule-red)" : "var(--passbook-gold)",
          backgroundColor: isExpense
            ? "color-mix(in srgb, var(--rule-red) 6%, transparent)"
            : "color-mix(in srgb, var(--passbook-gold) 6%, transparent)",
        } as React.CSSProperties
      }
    >
      <span className="opacity-90">LOGGED</span>
      <span className="opacity-50">·</span>
      <span>{formattedAmt}</span>
      <span className="opacity-50">·</span>
      <span className="max-w-[140px] truncate">{category}</span>
    </div>
  );
};

export const MultiLogStamps: React.FC<{
  items: Array<{ amount: number; category: string; type?: "expense" | "income" }>;
  currency?: string;
}> = ({ items, currency = "INR" }) => {
  return (
    <div className="flex flex-wrap gap-2.5 my-2">
      {items.map((item, idx) => (
        <LogStamp
          key={idx}
          amount={item.amount}
          category={item.category}
          type={item.type || "expense"}
          currency={currency}
          delayMs={idx * 85}
          rotationDeg={-3 - (idx % 4)}
        />
      ))}
    </div>
  );
};
