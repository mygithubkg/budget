"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MobileAnalysisView } from "@/components/mobile/MobileAnalysisView";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currency";
import {
  AnalysisPeriod,
  FullAnalysisPayload,
  ProjectionPoint,
} from "@/types/analysis";
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Calendar,
  Clock,
  Lightbulb,
  AlertTriangle,
  Info,
  DollarSign,
  PieChart as PieChartIcon,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from "lucide-react";
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

export const dynamic = "force-dynamic";

export default function AIAnalysisPage() {
  const { userProfile, getIdToken } = useAuth();
  const currency = userProfile?.currency || "INR";

  const [period, setPeriod] = useState<AnalysisPeriod>("month");
  const [data, setData] = useState<FullAnalysisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState<number | null>(null);

  const fetchAnalysis = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const token = await getIdToken();
        const res = await fetch(
          `/api/analysis?period=${period}${isRefresh ? "&refresh=true" : ""}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load analysis");
        }

        const result: FullAnalysisPayload = await res.json();
        setData(result);

        if (result.cooldownRemainingMs && result.cooldownRemainingMs > 0) {
          setCooldownRemainingMs(result.cooldownRemainingMs);
          if (isRefresh) {
            const mins = Math.ceil(result.cooldownRemainingMs / 60000);
            toast.info(`Recent analysis is active. Refresh cooldown: ~${mins} min.`);
          }
        } else {
          setCooldownRemainingMs(null);
          if (isRefresh) {
            toast.success("AI spending analysis refreshed!");
          }
        }
      } catch (err: any) {
        console.error("Error fetching analysis:", err);
        toast.error(err.message || "Could not load AI analysis.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getIdToken, period]
  );

  useEffect(() => {
    fetchAnalysis(false);
  }, [fetchAnalysis]);

  // Handle countdown timer for rate limit cooldown
  useEffect(() => {
    if (!cooldownRemainingMs || cooldownRemainingMs <= 0) return;

    const interval = setInterval(() => {
      setCooldownRemainingMs((prev) => {
        if (!prev || prev <= 1000) {
          clearInterval(interval);
          return null;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownRemainingMs]);

  const formatCooldownTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const stats = data?.stats;
  const narrative = data?.narrative;

  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point: ProjectionPoint = payload[0].payload;
      return (
        <div className="rounded-lg border border-fiber-line bg-card-bg p-2.5 shadow-md text-xs font-mono">
          <p className="font-bold text-ink-text pb-1">Day {point.day} ({point.dateStr})</p>
          {point.actualSpend !== undefined && (
            <p className="text-stamp-red">
              Actual Spend: {formatCurrency(point.actualSpend, currency)}
            </p>
          )}
          <p className="text-thrive-green">
            Projected Trajectory: {formatCurrency(point.projectedSpend, currency)}
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
        <div className="rounded-lg border border-fiber-line bg-card-bg p-2.5 shadow-md text-xs font-mono">
          <p className="font-bold text-ink-text pb-1">{item.dayName} Pattern</p>
          <p className="text-stamp-red">Daily Avg: {formatCurrency(item.avgSpend, currency)}</p>
          <p className="text-muted-text">90-Day Total: {formatCurrency(item.totalSpend, currency)}</p>
          {item.isOutlierHigh && (
            <p className="text-stamp-red font-bold pt-1">⚡ Peak High Spending Day</p>
          )}
          {item.isOutlierLow && (
            <p className="text-thrive-green font-bold pt-1">🌱 Low Expense Day</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* ── Mobile UI (<640px) ── */}
      <div className="block sm:hidden">
        <MobileAnalysisView
          period={period}
          onPeriodChange={setPeriod}
          data={data}
          loading={loading}
          refreshing={refreshing}
          cooldownRemainingMs={cooldownRemainingMs}
          onRefresh={() => fetchAnalysis(true)}
          formatCooldownTime={formatCooldownTime}
          currency={currency}
        />
      </div>

      {/* ── Desktop (>=640px) ── */}
      <div className="hidden sm:block flex-1 space-y-6 p-6 lg:p-8 max-w-6xl mx-auto text-on-surface">
        {/* ========================================================================= */}
        {/* 1. TOP CONTROLS & PERIOD SELECTOR */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-jetbrains-mono uppercase tracking-wider px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>AI Intelligence Diagnostics</span>
            </span>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex rounded-2xl border border-outline-variant/40 bg-surface-container-low p-1 text-xs font-jetbrains-mono">
              <button
                type="button"
                onClick={() => setPeriod("week")}
                className={`px-3 py-1.5 rounded-xl transition-all font-medium ${
                  period === "week"
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setPeriod("month")}
                className={`px-3 py-1.5 rounded-xl transition-all font-medium ${
                  period === "month"
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setPeriod("3months")}
                className={`px-3 py-1.5 rounded-xl transition-all font-medium ${
                  period === "3months"
                    ? "bg-primary text-on-primary font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                90 Days
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchAnalysis(true)}
              disabled={loading || refreshing || Boolean(cooldownRemainingMs)}
              title={
                cooldownRemainingMs
                  ? `Cooldown active: ${formatCooldownTime(cooldownRemainingMs)}`
                  : "Recalculate AI analysis"
              }
              className="flex items-center gap-2 h-9 px-3.5 rounded-2xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-xs font-jetbrains-mono font-semibold text-on-surface disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
              <span className="hidden md:inline">
                {cooldownRemainingMs
                  ? formatCooldownTime(cooldownRemainingMs)
                  : refreshing
                  ? "Analyzing..."
                  : "Refresh"}
              </span>
            </button>
          </div>
        </div>

        {/* Status Bar */}
        {data?.generatedAt && !loading && (
          <div className="flex items-center justify-between text-[11px] font-jetbrains-mono text-on-surface-variant px-1">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                Updated {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Zero math hallucination guarantee</span>
            </span>
          </div>
        )}

        {loading ? (
          /* Loading Skeleton */
          <div className="space-y-4 py-8 animate-pulse">
            <div className="h-28 rounded-3xl border border-outline-variant/40 bg-surface-container/60" />
            <div className="h-72 rounded-3xl border border-outline-variant/40 bg-surface-container/60" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-60 rounded-3xl border border-outline-variant/40 bg-surface-container/60" />
              <div className="h-60 rounded-3xl border border-outline-variant/40 bg-surface-container/60" />
            </div>
          </div>
        ) : !stats || stats.totalExpense === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border border-outline-variant/40 bg-surface-container p-10 text-center space-y-3">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Calendar className="h-6 w-6" />
            </div>
            <h2 className="font-display text-lg font-bold text-on-surface">
              No Transactions in Selected Period
            </h2>
            <p className="text-xs font-sans text-on-surface-variant max-w-md mx-auto">
              Record entries in the AI Register or via Telegram to generate real-time pace projections, pattern recognition, and category shift insights.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 2-Column Side-by-Side Desktop Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Summary + Projection Chart */}
              <div className="lg:col-span-7 space-y-6">
                {/* Executive Summary Card */}
                <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-3">
                  <div className="flex items-center gap-2.5 border-b border-outline-variant/40 pb-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-base font-bold text-on-surface">
                      Analyst Executive Summary
                    </h2>
                  </div>
                  <p className="font-sans text-sm sm:text-base text-on-surface leading-relaxed">
                    {narrative?.summary}
                  </p>
                </div>

                {/* Trajectory & Cumulative Spend */}
                <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/40 pb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h2 className="font-display text-base font-bold text-on-surface">
                        Cumulative Spend Trajectory
                      </h2>
                    </div>
                    <span className="text-[11px] font-jetbrains-mono text-on-surface-variant">
                      {stats.daysElapsed} of {stats.daysInPeriod} days elapsed
                    </span>
                  </div>

                  {/* Metric Overview Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-jetbrains-mono">
                    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-1">
                      <span className="text-[10px] text-on-surface-variant uppercase font-semibold">Actual Spend</span>
                      <p className="font-bold text-on-surface text-sm">
                        {formatCurrency(stats.totalExpense, currency)}
                      </p>
                      <span className="text-[10px] text-on-surface-variant block">
                        ~{formatCurrency(stats.currentDailyAvg, currency)} / day
                      </span>
                    </div>

                    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-1">
                      <span className="text-[10px] text-on-surface-variant uppercase font-semibold">Projected</span>
                      <p className="font-bold text-error text-sm">
                        {formatCurrency(stats.projectedMonthEndExpense, currency)}
                      </p>
                      <span className="text-[10px] text-on-surface-variant block">Blended pace</span>
                    </div>

                    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-1">
                      <span className="text-[10px] text-on-surface-variant uppercase font-semibold">Baseline Delta</span>
                      <div className="flex items-center gap-1 font-bold text-sm">
                        {stats.projectedDiffPercentage >= 0 ? (
                          <ArrowUpRight
                            className={`h-4 w-4 ${
                              stats.projectedDiffPercentage > 15 ? "text-error" : "text-emerald-500"
                            }`}
                          />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-emerald-500" />
                        )}
                        <span
                          className={
                            stats.projectedDiffPercentage > 15
                              ? "text-error"
                              : stats.projectedDiffPercentage < -10
                              ? "text-emerald-500"
                              : "text-on-surface"
                          }
                        >
                          {Math.abs(stats.projectedDiffPercentage)}%
                        </span>
                      </div>
                      <span className="text-[10px] text-on-surface-variant block">vs 90d baseline</span>
                    </div>

                    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3 space-y-1">
                      <span className="text-[10px] text-on-surface-variant uppercase font-semibold">Savings Rate</span>
                      <p
                        className={`font-bold text-sm ${
                          stats.savingsRate >= 0.2 ? "text-emerald-500" : "text-on-surface"
                        }`}
                      >
                        {Math.round(stats.savingsRate * 100)}%
                      </p>
                      <span className="text-[10px] text-on-surface-variant block">
                        Past: {Math.round(stats.historicalSavingsRate * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Projection Narrative Note */}
                  {narrative?.projection?.narrative && (
                    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/70 p-3.5 text-xs font-sans text-on-surface leading-relaxed">
                      <span className="font-bold font-jetbrains-mono text-[11px] text-primary uppercase block pb-0.5">
                        Trajectory Outlook:
                      </span>
                      {narrative.projection.narrative}
                    </div>
                  )}

                  {/* Chart */}
                  <div className="h-64 sm:h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={stats.projectionSeries}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                        <XAxis
                          dataKey="day"
                          stroke="currentColor"
                          opacity={0.6}
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(val) => `D${val}`}
                        />
                        <YAxis
                          stroke="currentColor"
                          opacity={0.6}
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                        />
                        <Tooltip content={<CustomLineTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="projectedSpend"
                          stroke="#EAB308"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                          name="Projected Continuation"
                        />
                        <Line
                          type="monotone"
                          dataKey="actualSpend"
                          stroke="#6366F1"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#6366F1" }}
                          activeDot={{ r: 5 }}
                          name="Actual Spend"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Weekday Pattern + Patterns + Opportunities */}
              <div className="lg:col-span-5 space-y-6">
                {/* Weekday Intensity Bar Chart */}
                <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-4">
                  <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <h2 className="font-display text-base font-bold text-on-surface">
                        Weekday Pattern (90d)
                      </h2>
                    </div>
                    <span className="text-[10px] font-jetbrains-mono text-on-surface-variant">Daily Average</span>
                  </div>

                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.weekdayStats}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                        <XAxis dataKey="dayName" stroke="currentColor" opacity={0.6} fontSize={11} tickLine={false} />
                        <YAxis
                          stroke="currentColor"
                          opacity={0.6}
                          fontSize={11}
                          tickLine={false}
                          tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                        />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar dataKey="avgSpend" radius={[6, 6, 0, 0]}>
                          {stats.weekdayStats.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.isOutlierHigh
                                  ? "#EF4444"
                                  : entry.isOutlierLow
                                  ? "#10B981"
                                  : "#6366F1"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* AI Pattern Observations */}
                <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-4">
                  <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                    <Lightbulb className="h-4 w-4 text-emerald-500" />
                    <h2 className="font-display text-base font-bold text-on-surface">
                      Observed Spending Patterns
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {narrative?.patterns?.map((pattern, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3.5 space-y-1"
                      >
                        <h3 className="font-bold font-display text-xs text-on-surface flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {pattern.title}
                        </h3>
                        <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                          {pattern.narrative}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Opportunities & Shift highlights */}
                {narrative?.opportunities && narrative.opportunities.length > 0 && (
                  <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-4">
                    <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                      <Layers className="h-4 w-4 text-primary" />
                      <h2 className="font-display text-base font-bold text-on-surface">
                        Actionable Opportunities
                      </h2>
                    </div>

                    <div className="space-y-3">
                      {narrative.opportunities.map((opp, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3.5 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-on-surface flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {opp.title}
                            </span>
                            {opp.category && (
                              <span className="text-[10px] font-jetbrains-mono px-2 py-0.5 rounded-md border border-outline-variant/40 bg-surface-container text-on-surface-variant">
                                {opp.category}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-sans text-on-surface-variant leading-relaxed">
                            {opp.narrative}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notable Outlier Transactions */}
            {stats.topOutliers && stats.topOutliers.length > 0 && (
              <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-base font-bold text-on-surface">
                      Largest Transactions This Period
                    </h2>
                  </div>
                  <span className="text-[10px] font-jetbrains-mono text-on-surface-variant">Top Outliers</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 font-jetbrains-mono text-xs">
                  {stats.topOutliers.map((tx, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-outline-variant/40 bg-surface-container-low"
                    >
                      <div className="space-y-0.5 truncate mr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface truncate">{tx.description}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span>{tx.category}</span>
                        </div>
                      </div>
                      <span className="font-bold text-error text-sm shrink-0">
                        {formatCurrency(tx.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Disclaimer */}
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low/40 p-4 text-center text-[11px] font-sans text-on-surface-variant">
              <p>
                Informational analysis computed from your recorded ledger entries. FinChat does not provide formal investment or financial advice.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
