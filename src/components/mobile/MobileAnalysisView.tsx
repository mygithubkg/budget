"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currency";
import {
  AnalysisPeriod,
  FullAnalysisPayload,
  ProjectionPoint,
} from "@/types/analysis";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { motion, useReducedMotion } from "motion/react";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface MobileAnalysisViewProps {
  period: AnalysisPeriod;
  onPeriodChange: (p: AnalysisPeriod) => void;
  data: FullAnalysisPayload | null;
  loading: boolean;
  refreshing: boolean;
  cooldownRemainingMs: number | null;
  onRefresh: () => void;
  formatCooldownTime: (ms: number) => string;
  currency: string;
}

export function MobileAnalysisView({
  period,
  onPeriodChange,
  data,
  loading,
  refreshing,
  cooldownRemainingMs,
  onRefresh,
  formatCooldownTime,
  currency,
}: MobileAnalysisViewProps) {
  const shouldReduceMotion = useReducedMotion();

  const stats = data?.stats;
  const narrative = data?.narrative;

  const CustomLineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point: ProjectionPoint = payload[0].payload;
      return (
        <div className="rounded-2xl border border-fiber-line dark:border-white/[0.06] bg-md-surface-container p-2.5 shadow-md text-xs font-inter">
          <p className="font-bold text-md-on-surface pb-1">
            Day {point.day} ({point.dateStr})
          </p>
          {point.actualSpend !== undefined && (
            <p className="text-md-error">
              Actual: {formatCurrency(point.actualSpend, currency)}
            </p>
          )}
          <p className="text-md-tertiary">
            Projected: {formatCurrency(point.projectedSpend, currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="rounded-2xl border border-fiber-line dark:border-white/[0.06] bg-md-surface-container p-2.5 shadow-md text-xs font-inter">
          <p className="font-bold text-md-on-surface pb-1">
            {item.dayName} Pattern
          </p>
          <p className="text-md-error">
            Avg: {formatCurrency(item.avgSpend, currency)}
          </p>
          <p className="text-md-on-surface-variant">
            90d Total: {formatCurrency(item.totalSpend, currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 px-3.5 py-2 pb-24 text-md-on-surface font-inter">
      {/* ── Page Title ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-md-on-surface font-inter">
            AI Insights
          </h1>
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-md-secondary-container text-md-on-secondary-container">
            <MaterialIcon name="auto_awesome" size={12} />
            Pro
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || refreshing || Boolean(cooldownRemainingMs)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-md-surface-container-high text-md-on-surface-variant border border-fiber-line dark:border-white/[0.06] disabled:opacity-40 active:scale-95 transition-transform"
        >
          <MaterialIcon
            name="refresh"
            size={20}
            className={refreshing ? "animate-spin text-md-primary" : ""}
          />
        </button>
      </div>

      {/* ── Period Segmented Pill Switcher ── */}
      <div className="flex rounded-full bg-md-surface-container-high border border-fiber-line dark:border-white/[0.06] p-1 text-xs font-medium gap-0.5">
        {(
          [
            { key: "week", label: "Week" },
            { key: "month", label: "Month" },
            { key: "3months", label: "90 Days" },
          ] as { key: AnalysisPeriod; label: string }[]
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onPeriodChange(item.key)}
            className={`flex-1 py-2 px-3 rounded-full text-center whitespace-nowrap transition-all font-inter ${
              period === item.key
                ? "bg-md-surface-bright text-md-on-surface font-bold shadow-sm"
                : "text-md-on-surface-variant hover:text-md-on-surface"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Cooldown / Timestamp Bar ── */}
      {cooldownRemainingMs && cooldownRemainingMs > 0 && (
        <div className="flex items-center gap-2 rounded-full bg-md-secondary-container/30 px-3 py-1.5 text-[11px] font-medium text-md-on-secondary-container font-inter">
          <MaterialIcon name="timer" size={14} />
          <span>Refresh in {formatCooldownTime(cooldownRemainingMs)}</span>
        </div>
      )}

      {data?.generatedAt && !loading && (
        <div className="flex items-center justify-between text-[11px] text-md-on-surface-variant font-inter px-1">
          <span className="flex items-center gap-1">
            <MaterialIcon name="schedule" size={14} className="text-md-tertiary" />
            Updated{" "}
            {formatDistanceToNow(new Date(data.generatedAt), {
              addSuffix: true,
            })}
          </span>
          <span className="flex items-center gap-1">
            <MaterialIcon name="verified" size={14} className="text-md-tertiary" />
            No math hallucination
          </span>
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading ? (
        <div className="space-y-3 py-4 animate-pulse">
          <div className="h-32 rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06]" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06]" />
            <div className="h-24 rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06]" />
          </div>
          <div className="h-56 rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06]" />
        </div>
      ) : !stats || stats.totalExpense === 0 ? (
        /* Empty State */
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-8 text-center md-card-shadow"
        >
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-md-secondary-container/30 text-md-secondary mb-3">
            <MaterialIcon name="calendar_month" size={24} />
          </div>
          <p className="text-sm font-semibold text-md-on-surface font-inter">
            No Transactions in Period
          </p>
          <p className="text-xs text-md-on-surface-variant mt-1 font-inter max-w-xs mx-auto">
            Record entries in the AI Register to generate pace projections and pattern insights.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* ── Executive Summary Card ── */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[24px] bg-md-surface-container-high border border-fiber-line dark:border-white/[0.08] p-5 md-hero-shadow"
          >
            <div className="absolute inset-0 md-sheen pointer-events-none" />
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-2">
                <MaterialIcon name="auto_awesome" size={18} className="text-md-primary" />
                <h2 className="text-sm font-bold text-md-on-surface font-inter">
                  Executive Summary
                </h2>
              </div>
              <p className="text-sm text-md-on-surface leading-relaxed font-inter font-normal">
                {narrative?.summary}
              </p>
              {stats.transfersTotal > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-fiber-line dark:border-white/[0.06] text-xs text-md-on-surface-variant font-inter">
                  <MaterialIcon name="info" size={14} className="text-md-primary shrink-0" />
                  <span>
                    <strong className="text-md-on-surface font-semibold">{stats.transfersTotalFormatted}</strong> moved to savings/transfers (excluded from spend).
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── 4 KPI Metric Cards (2×2) ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Actual Spend */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
              className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-md-error-container/30 text-md-error">
                  <MaterialIcon name="receipt_long" size={14} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
                  Spend
                </span>
              </div>
              <p className="text-lg font-bold font-jetbrains-mono tracking-tight text-md-on-surface tabular-nums">
                {stats.totalExpenseFormatted || formatCurrency(stats.totalExpense, currency)}
              </p>
              <p className="text-[10px] text-md-on-surface-variant font-inter mt-0.5">
                ~{stats.currentDailyAvgFormatted || formatCurrency(stats.currentDailyAvg, currency)}/day
              </p>
            </motion.div>

            {/* Projected */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
              className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-md-secondary-container/30 text-md-secondary">
                  <MaterialIcon name="trending_up" size={14} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
                  Projected
                </span>
              </div>
              <p className="text-lg font-bold font-jetbrains-mono tracking-tight text-md-error tabular-nums">
                {stats.projectedMonthEndExpenseFormatted || formatCurrency(stats.projectedMonthEndExpense, currency)}
              </p>
              <p className="text-[10px] text-md-on-surface-variant font-inter mt-0.5">
                Blended pace
              </p>
            </motion.div>

            {/* Baseline Delta */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
              className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-md-primary-container/30 text-md-primary">
                  <MaterialIcon name="compare_arrows" size={14} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
                  Delta
                </span>
              </div>
              <div className="flex items-center gap-1">
                <MaterialIcon
                  name={stats.projectedDiffPercentage >= 0 ? "arrow_upward" : "arrow_downward"}
                  size={16}
                  className={
                    stats.projectedDiffPercentage > 15
                      ? "text-md-error"
                      : "text-md-tertiary"
                  }
                />
                <span
                  className={`text-lg font-bold font-jetbrains-mono tabular-nums ${
                    stats.projectedDiffPercentage > 15
                      ? "text-md-error"
                      : stats.projectedDiffPercentage < -10
                      ? "text-md-tertiary"
                      : "text-md-on-surface"
                  }`}
                >
                  {Math.abs(stats.projectedDiffPercentage)}%
                </span>
              </div>
              <p className="text-[10px] text-md-on-surface-variant font-inter mt-0.5">
                vs 90d baseline
              </p>
            </motion.div>

            {/* Savings Rate */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}
              className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-md-tertiary-container/30 text-md-tertiary">
                  <MaterialIcon name="savings" size={14} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
                  Savings
                </span>
              </div>
              <p
                className={`text-lg font-bold font-jetbrains-mono tabular-nums ${
                  stats.savingsRate >= 0.2 ? "text-md-tertiary" : "text-md-on-surface"
                }`}
              >
                {stats.savingsRatePercentFormatted || `${Math.round(stats.savingsRate * 100)}%`}
              </p>
              <p className="text-[10px] text-md-on-surface-variant font-inter mt-0.5">
                Hist: {stats.historicalSavingsRatePercentFormatted || `${Math.round(stats.historicalSavingsRate * 100)}%`}
              </p>
            </motion.div>
          </div>

          {/* ── Trajectory Outlook Note & Recurring Items ── */}
          {narrative?.projection?.narrative && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25, ease: "easeOut" }}
              className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow space-y-2"
            >
              <div className="flex items-center gap-1.5">
                <MaterialIcon name="route" size={16} className="text-md-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-md-primary font-inter">
                  Trajectory
                </span>
              </div>
              <p className="text-xs text-md-on-surface leading-relaxed font-inter">
                {narrative.projection.narrative}
              </p>
              {stats.recurringNotYetOccurredTotal > 0 && (
                <div className="pt-2 border-t border-fiber-line dark:border-white/[0.06] text-[11px] text-md-on-surface-variant flex items-center gap-1.5 font-inter">
                  <MaterialIcon name="info" size={14} className="text-md-primary shrink-0" />
                  <span>
                    Includes <strong className="text-md-on-surface">{stats.recurringNotYetOccurredTotalFormatted}</strong> in expected bills ({stats.expectedRecurringItems.map((i) => i.description).join(", ")}) not yet posted.
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Spend Trajectory Chart ── */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3, ease: "easeOut" }}
            className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MaterialIcon name="show_chart" size={18} className="text-md-primary" />
                <h3 className="text-sm font-bold text-md-on-surface font-inter">
                  Spend Trajectory
                </h3>
              </div>
              <span className="text-[10px] text-md-on-surface-variant font-inter">
                {stats.daysElapsed}/{stats.daysInPeriod} days
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.projectionSeries}
                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--md-outline-variant)"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="var(--md-outline)"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => `D${val}`}
                  />
                  <YAxis
                    stroke="var(--md-outline)"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
                    }
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="projectedSpend"
                    stroke="var(--md-outline)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualSpend"
                    stroke="var(--md-primary)"
                    strokeWidth={2.5}
                    dot={{ r: 2, fill: "var(--md-primary)" }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* ── Observed Patterns ── */}
          {narrative?.patterns && narrative.patterns.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold tracking-[0.05em] uppercase text-md-on-surface-variant font-inter px-1">
                Spending Patterns
              </h3>
              {narrative.patterns.map((pattern, idx) => (
                <motion.div
                  key={idx}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: idx * 0.04,
                    ease: "easeOut",
                  }}
                  className="relative overflow-hidden rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
                >
                  {/* 3px Accent bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-md-primary" />
                  <div className="pl-2 space-y-1">
                    <h4 className="text-sm font-semibold text-md-on-surface font-inter">
                      {pattern.title}
                    </h4>
                    <p className="text-xs text-md-on-surface-variant leading-relaxed font-inter">
                      {pattern.narrative}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Day-of-Week Chart ── */}
          {stats.weekdayStats && stats.weekdayStats.length > 0 && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MaterialIcon name="calendar_month" size={18} className="text-md-secondary" />
                  <h3 className="text-sm font-bold text-md-on-surface font-inter">
                    Weekly Pattern
                  </h3>
                </div>
                <span className="text-[10px] text-md-on-surface-variant font-inter">
                  Daily Avg
                </span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.weekdayStats}
                    margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--md-outline-variant)"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="dayName"
                      stroke="var(--md-outline)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--md-outline)"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(val) =>
                        val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
                      }
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="avgSpend" radius={[6, 6, 0, 0]}>
                      {stats.weekdayStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.isOutlierHigh
                              ? "var(--md-error)"
                              : entry.isOutlierLow
                              ? "var(--md-tertiary)"
                              : "var(--md-primary)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {/* ── Opportunities ── */}
          {narrative?.opportunities && narrative.opportunities.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold tracking-[0.05em] uppercase text-md-on-surface-variant font-inter px-1">
                Worth a Look
              </h3>
              {narrative.opportunities.map((opp, idx) => (
                <motion.div
                  key={idx}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: idx * 0.04,
                    ease: "easeOut",
                  }}
                  className="relative overflow-hidden rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-md-tertiary" />
                  <div className="pl-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-md-on-surface font-inter">
                        {opp.title}
                      </h4>
                      {opp.category && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-md-surface-container-high text-md-on-surface-variant font-inter">
                          {opp.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-md-on-surface-variant leading-relaxed font-inter">
                      {opp.narrative}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Category Deltas ── */}
          {stats.categoryDeltas && stats.categoryDeltas.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold tracking-[0.05em] uppercase text-md-on-surface-variant font-inter px-1">
                Category Shifts
              </h3>
              {stats.categoryDeltas.slice(0, 6).map((cd, idx) => (
                <motion.div
                  key={idx}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: idx * 0.03,
                    ease: "easeOut",
                  }}
                  className="flex items-center justify-between rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-3.5 md-card-shadow"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-md-on-surface font-inter truncate">
                      {cd.category}
                    </p>
                    <p className="text-[11px] text-md-on-surface-variant font-inter mt-0.5">
                      {formatCurrency(cd.currentSpend, currency)}{" "}
                      <span className="text-md-on-surface-variant/60">
                        ← {formatCurrency(cd.priorSpend, currency)}
                      </span>
                    </p>
                  </div>
                  <span
                    className={`font-jetbrains-mono font-bold text-sm tabular-nums flex-shrink-0 ${
                      cd.changePercent > 0
                        ? "text-md-error"
                        : cd.changePercent < 0
                        ? "text-md-tertiary"
                        : "text-md-on-surface-variant"
                    }`}
                  >
                    {cd.changePercent > 0 ? "+" : ""}
                    {cd.changePercent}%
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Top Outliers ── */}
          {stats.topOutliers && stats.topOutliers.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold tracking-[0.05em] uppercase text-md-on-surface-variant font-inter px-1">
                Largest Transactions
              </h3>
              {stats.topOutliers.map((tx, idx) => (
                <motion.div
                  key={idx}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: idx * 0.04,
                    ease: "easeOut",
                  }}
                  className="flex items-center justify-between rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-3.5 md-card-shadow"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-md-on-surface font-inter truncate">
                        {tx.description}
                      </p>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-md-surface-container-high text-md-on-surface-variant font-inter flex-shrink-0">
                        {tx.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-md-on-surface-variant font-inter mt-0.5">
                      {tx.date}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-md-error font-jetbrains-mono tabular-nums flex-shrink-0">
                    {formatCurrency(tx.amount, currency)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Disclaimer ── */}
          <div className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 text-center text-[11px] text-md-on-surface-variant font-inter md-card-shadow">
            Informational analysis from your ledger. FinChat does not provide financial advice.
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileAnalysisView;
