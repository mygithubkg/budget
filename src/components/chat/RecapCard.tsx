"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, TrendingUp, ArrowRight, Lightbulb } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface RecapCardProps {
  content: string;
  recapData?: {
    period: "weekly" | "monthly";
    projection?: {
      narrative: string;
      projectedTotal: number;
      comparedToAverage: string;
    };
    patterns?: Array<{ title: string; narrative: string }>;
    opportunities?: Array<{ title: string; narrative: string; category: string | null }>;
    stats?: {
      totalExpense: number;
      totalIncome: number;
      savingsRate: number;
      projectedMonthEndExpense: number;
      projectedDiffPercentage: number;
    };
  };
  currency?: string;
}

export function RecapCard({ content, recapData, currency = "INR" }: RecapCardProps) {
  const periodLabel = recapData?.period === "monthly" ? "Monthly Recap" : "Weekly Recap";
  const projection = recapData?.projection;
  const topPattern = recapData?.patterns?.[0];
  const topOpportunity = recapData?.opportunities?.[0];
  const stats = recapData?.stats;

  return (
    <div className="w-full rounded-xl border border-fiber-line bg-card-bg p-4 sm:p-5 shadow-xs space-y-3.5 text-xs text-ink-text">
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-stamp-red/10 text-stamp-red">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-ink-text">
            {periodLabel}
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[3px] border border-stamp-red/30 bg-stamp-red/5 text-stamp-red font-bold">
          Proactive AI
        </span>
      </div>

      {/* Summary Narrative */}
      <div className="font-sans text-xs sm:text-sm text-ink-text leading-relaxed">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>

      {/* Projection Metric Pill */}
      {stats && projection && (
        <div className="rounded-lg border border-fiber-line bg-paper-bg p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-center font-mono">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-text uppercase">Total Spend</span>
            <p className="font-bold text-ink-text text-xs sm:text-sm">
              {formatCurrency(stats.totalExpense, currency)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-text uppercase">Projected</span>
            <p className="font-bold text-stamp-red text-xs sm:text-sm">
              {formatCurrency(projection.projectedTotal, currency)}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 space-y-0.5">
            <span className="text-[10px] text-muted-text uppercase">Baseline Delta</span>
            <p
              className={`font-bold text-xs sm:text-sm ${
                stats.projectedDiffPercentage > 15
                  ? "text-stamp-red"
                  : stats.projectedDiffPercentage < -10
                  ? "text-thrive-green"
                  : "text-ink-text"
              }`}
            >
              {projection.comparedToAverage}
            </p>
          </div>
        </div>
      )}

      {/* Spotlight Observation */}
      {(topPattern || topOpportunity) && (
        <div className="space-y-1.5 pt-0.5">
          {topPattern && (
            <div className="flex items-start gap-2 text-xs text-muted-text bg-card-bg border border-fiber-line/80 rounded-lg p-2.5">
              <TrendingUp className="h-4 w-4 text-thrive-green shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-ink-text">{topPattern.title}: </span>
                <span>{topPattern.narrative}</span>
              </div>
            </div>
          )}
          {topOpportunity && (
            <div className="flex items-start gap-2 text-xs text-muted-text bg-card-bg border border-fiber-line/80 rounded-lg p-2.5">
              <Lightbulb className="h-4 w-4 text-thrive-green shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-ink-text">{topOpportunity.title}: </span>
                <span>{topOpportunity.narrative}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Call to action link */}
      <div className="pt-1 flex justify-end">
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-stamp-red hover:underline hover:opacity-85 transition-opacity"
        >
          <span>View Full Visual Analysis</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
