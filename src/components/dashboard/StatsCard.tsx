import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  type?: "expense" | "income" | "neutral" | "gold";
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  type = "neutral",
  className,
}: StatsCardProps) {
  const isIncome = type === "income" || type === "gold";
  const isExpense = type === "expense";

  return (
    <div
      className={cn(
        "relative rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-5 overflow-hidden transition-all duration-150 desktop-card-hover group",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="font-jetbrains-mono text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant truncate">
          {title}
        </span>
        {Icon && (
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-xl transition-colors",
              isIncome
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : isExpense
                ? "bg-error/15 text-error"
                : "bg-surface-container-high text-on-surface-variant"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
          </div>
        )}
      </div>

      <div
        className={cn(
          "font-jetbrains-mono text-xl sm:text-2xl font-bold tracking-tight",
          isIncome
            ? "text-emerald-600 dark:text-emerald-400"
            : isExpense
            ? "text-error"
            : "text-on-surface"
        )}
      >
        {value}
      </div>

      {subtitle && (
        <div className="mt-1.5 text-[11px] font-sans text-on-surface-variant truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
}
