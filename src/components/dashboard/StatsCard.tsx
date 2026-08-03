import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorScheme?: "primary" | "income" | "expense" | "purple" | "amber";
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  colorScheme = "primary",
  className,
}: StatsCardProps) {
  const colorMap = {
    primary: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    income: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    expense: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  };

  return (
    <Card className={cn("overflow-hidden border border-border/80 shadow-sm transition-all hover:shadow-md", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", colorMap[colorScheme])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {value}
          </div>
          {(subtitle || trend) && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {trend && (
                <span
                  className={cn(
                    "font-semibold",
                    trend.isPositive ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {trend.value}
                </span>
              )}
              {subtitle && <span>{subtitle}</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
