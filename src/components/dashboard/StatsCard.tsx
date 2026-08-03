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
  const marginColor =
    type === "expense"
      ? "var(--rule-red)"
      : type === "income" || type === "gold"
      ? "var(--passbook-gold)"
      : "var(--stamp-indigo)";

  return (
    <div
      className={cn(
        "relative rounded-[8px] border border-fiber-line bg-card-bg p-4 pl-4.5 shadow-sm overflow-hidden shrink-0 min-w-[220px] sm:min-w-0 transition-colors",
        className
      )}
    >
      {/* Red/Gold margin rule motif on left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: marginColor }}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-text truncate">
          {title}
        </span>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-text shrink-0" />}
      </div>

      <div className="mt-2">
        <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-ink-text">
          {value}
        </div>
        {subtitle && (
          <div className="mt-1 text-[11px] font-sans text-muted-text truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
