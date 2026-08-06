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
  const accentColor =
    type === "expense"
      ? "var(--stamp-red)"
      : type === "income" || type === "gold"
      ? "var(--thrive-green)"
      : "var(--stamp-red)";

  const valueColor =
    type === "expense"
      ? "text-stamp-red"
      : type === "income" || type === "gold"
      ? "text-thrive-green"
      : "text-ink-text";

  return (
    <div
      className={cn(
        // Base layout
        "relative rounded-xl border border-fiber-line bg-card-bg p-4 pl-5 overflow-hidden shrink-0 min-w-[220px] sm:min-w-0 transition-all duration-200",
        // Tactile card shadow (light mode) — dark mode uses lifted surface via bg-card-bg
        "shadow-card dark:shadow-none dark:border dark:border-white/[0.06]",
        // Hover lift
        "hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
    >
      {/* Margin rule — vivid stamp-red accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-text truncate">
          {title}
        </span>
        {Icon && (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />
          </div>
        )}
      </div>

      <div className={cn("font-mono text-xl sm:text-2xl font-bold tracking-tight", valueColor)}>
        {value}
      </div>

      {subtitle && (
        <div className="mt-1 text-[11px] font-sans text-muted-text truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
}
