"use client";

import React, { useState, useEffect, useCallback } from "react";
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
        <div className="rounded-[4px] border border-fiber-line bg-card-bg p-2.5 shadow-md text-xs font-mono">
          <p className="font-bold text-ink-text pb-1">Day {point.day} ({point.dateStr})</p>
          {point.actualSpend !== undefined && (
            <p className="text-stamp-indigo">
              Actual Spend: {formatCurrency(point.actualSpend, currency)}
            </p>
          )}
          <p className="text-passbook-gold">
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
        <div className="rounded-[4px] border border-fiber-line bg-card-bg p-2.5 shadow-md text-xs font-mono">
          <p className="font-bold text-ink-text pb-1">{item.dayName} Pattern</p>
          <p className="text-stamp-indigo">Daily Avg: {formatCurrency(item.avgSpend, currency)}</p>
          <p className="text-muted-text">90-Day Total: {formatCurrency(item.totalSpend, currency)}</p>
          {item.isOutlierHigh && (
            <p className="text-rule-red font-bold pt-1">⚡ Peak High Spending Day</p>
          )}
          {item.isOutlierLow && (
            <p className="text-stamp-emerald font-bold pt-1">🌱 Low Expense Day</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto text-ink-text">
      {/* ========================================================================= */}
      {/* 1. HEADER & PERIOD SELECTOR */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-fiber-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
              AI Spending Analysis
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[3px] border border-stamp-indigo/30 bg-stamp-indigo/10 text-stamp-indigo font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Pro Insights
            </span>
          </div>
          <p className="text-xs font-sans text-muted-text pt-0.5">
            Deterministic aggregation interpreted with supportive, matter-of-fact AI pattern recognition.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Period Selector */}
          <div className="flex rounded-[6px] border border-fiber-line bg-paper-bg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setPeriod("week")}
              className={`px-3 py-1 rounded-[4px] transition-colors ${
                period === "week"
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                  : "text-muted-text hover:text-ink-text"
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => setPeriod("month")}
              className={`px-3 py-1 rounded-[4px] transition-colors ${
                period === "month"
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                  : "text-muted-text hover:text-ink-text"
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => setPeriod("3months")}
              className={`px-3 py-1 rounded-[4px] transition-colors ${
                period === "3months"
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                  : "text-muted-text hover:text-ink-text"
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
            className="flex items-center gap-1.5 h-8 px-3 rounded-[4px] border border-fiber-line bg-card-bg hover:bg-paper-bg text-xs font-mono text-ink-text disabled:opacity-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-stamp-indigo" : ""}`} />
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
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-text px-1">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-passbook-gold" />
            <span>
              Updated {formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true })}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-stamp-emerald" />
            <span>Zero math hallucination guarantee</span>
          </span>
        </div>
      )}

      {loading ? (
        /* Loading Skeleton */
        <div className="space-y-4 py-8 animate-pulse">
          <div className="h-28 rounded-[8px] border border-fiber-line bg-card-bg/60" />
          <div className="h-72 rounded-[8px] border border-fiber-line bg-card-bg/60" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-60 rounded-[8px] border border-fiber-line bg-card-bg/60" />
            <div className="h-60 rounded-[8px] border border-fiber-line bg-card-bg/60" />
          </div>
        </div>
      ) : !stats || stats.totalExpense === 0 ? (
        /* Empty State */
        <div className="rounded-[8px] border border-fiber-line bg-card-bg p-8 text-center space-y-3">
          <div className="h-10 w-10 mx-auto rounded-full bg-stamp-indigo/10 flex items-center justify-center text-stamp-indigo">
            <Calendar className="h-5 w-5" />
          </div>
          <h2 className="font-display text-base font-bold text-ink-text">
            No Transactions in Selected Period
          </h2>
          <p className="text-xs font-sans text-muted-text max-w-md mx-auto">
            Record entries in the AI Register or via Telegram to generate real-time pace projections, pattern recognition, and category shift insights.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ========================================================================= */}
          {/* 2. EXECUTIVE PROSE SUMMARY CARD */}
          {/* ========================================================================= */}
          <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 sm:p-6 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
              <Sparkles className="h-4 w-4 text-stamp-indigo" />
              <h2 className="font-display text-base font-bold text-ink-text">
                Analyst Executive Summary
              </h2>
            </div>
            <p className="font-sans text-sm sm:text-base text-ink-text leading-relaxed font-normal">
              {narrative?.summary}
            </p>
          </div>

          {/* ========================================================================= */}
          {/* 3. PACE & PROJECTED TRAJECTORY (RECHARTS) */}
          {/* ========================================================================= */}
          <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-fiber-line pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-stamp-indigo" />
                <h2 className="font-display text-base font-bold text-ink-text">
                  Cumulative Spend &amp; Month-End Trajectory
                </h2>
              </div>
              <span className="text-[11px] font-mono text-muted-text">
                {stats.daysElapsed} of {stats.daysInPeriod} days elapsed
              </span>
            </div>

            {/* Metric Overview Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="rounded-[6px] border border-fiber-line bg-paper-bg p-3 space-y-0.5">
                <span className="text-[10px] text-muted-text uppercase">Actual Spend</span>
                <p className="font-bold text-ink-text text-sm sm:text-base">
                  {formatCurrency(stats.totalExpense, currency)}
                </p>
                <span className="text-[10px] text-muted-text block">
                  ~{formatCurrency(stats.currentDailyAvg, currency)} / day
                </span>
              </div>

              <div className="rounded-[6px] border border-fiber-line bg-paper-bg p-3 space-y-0.5">
                <span className="text-[10px] text-muted-text uppercase">Projected Total</span>
                <p className="font-bold text-stamp-indigo text-sm sm:text-base">
                  {formatCurrency(stats.projectedMonthEndExpense, currency)}
                </p>
                <span className="text-[10px] text-muted-text block">Blended pace</span>
              </div>

              <div className="rounded-[6px] border border-fiber-line bg-paper-bg p-3 space-y-0.5">
                <span className="text-[10px] text-muted-text uppercase">Baseline Delta</span>
                <div className="flex items-center gap-1 font-bold text-sm sm:text-base">
                  {stats.projectedDiffPercentage >= 0 ? (
                    <ArrowUpRight
                      className={`h-4 w-4 ${
                        stats.projectedDiffPercentage > 15 ? "text-rule-red" : "text-passbook-gold"
                      }`}
                    />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-stamp-emerald" />
                  )}
                  <span
                    className={
                      stats.projectedDiffPercentage > 15
                        ? "text-rule-red"
                        : stats.projectedDiffPercentage < -10
                        ? "text-stamp-emerald"
                        : "text-ink-text"
                    }
                  >
                    {Math.abs(stats.projectedDiffPercentage)}%
                  </span>
                </div>
                <span className="text-[10px] text-muted-text block">vs 90-day baseline</span>
              </div>

              <div className="rounded-[6px] border border-fiber-line bg-paper-bg p-3 space-y-0.5">
                <span className="text-[10px] text-muted-text uppercase">Savings Rate</span>
                <p
                  className={`font-bold text-sm sm:text-base ${
                    stats.savingsRate >= 0.2 ? "text-stamp-emerald" : "text-ink-text"
                  }`}
                >
                  {Math.round(stats.savingsRate * 100)}%
                </p>
                <span className="text-[10px] text-muted-text block">
                  Historical: {Math.round(stats.historicalSavingsRate * 100)}%
                </span>
              </div>
            </div>

            {/* Projection Narrative Note */}
            {narrative?.projection?.narrative && (
              <div className="rounded-[4px] border border-fiber-line/80 bg-paper-bg/60 p-3 text-xs font-sans text-ink-text leading-relaxed">
                <span className="font-bold font-mono text-[11px] text-stamp-indigo uppercase block pb-0.5">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#D5CEBA" opacity={0.3} />
                  <XAxis
                    dataKey="day"
                    stroke="#7A808A"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `D${val}`}
                  />
                  <YAxis
                    stroke="#7A808A"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  {/* Projected Dotted Line */}
                  <Line
                    type="monotone"
                    dataKey="projectedSpend"
                    stroke="#B8860B"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name="Projected Continuation"
                  />
                  {/* Actual Solid Line */}
                  <Line
                    type="monotone"
                    dataKey="actualSpend"
                    stroke="#2D4B73"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: "#2D4B73" }}
                    activeDot={{ r: 5 }}
                    name="Actual Spend"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. PATTERNS & 90-DAY WEEKDAY BAR CHART */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: AI Pattern Observations */}
            <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xs space-y-3.5">
              <div className="flex items-center gap-2 border-b border-fiber-line pb-2.5">
                <Lightbulb className="h-4 w-4 text-passbook-gold" />
                <h2 className="font-display text-base font-bold text-ink-text">
                  Observed Spending Patterns
                </h2>
              </div>

              <div className="space-y-3">
                {narrative?.patterns?.map((pattern, idx) => (
                  <div
                    key={idx}
                    className="rounded-[6px] border border-fiber-line bg-paper-bg p-3.5 space-y-1"
                  >
                    <h3 className="font-bold font-display text-xs text-ink-text flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-stamp-indigo" />
                      {pattern.title}
                    </h3>
                    <p className="text-xs font-sans text-muted-text leading-relaxed">
                      {pattern.narrative}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Weekday Intensity Bar Chart */}
            <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-stamp-indigo" />
                  <h2 className="font-display text-base font-bold text-ink-text">
                    Day-of-Week 90-Day Baseline
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-muted-text">Daily Average</span>
              </div>

              <div className="h-52 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.weekdayStats}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#D5CEBA" opacity={0.3} />
                    <XAxis dataKey="dayName" stroke="#7A808A" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#7A808A"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="avgSpend" radius={[4, 4, 0, 0]}>
                      {stats.weekdayStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.isOutlierHigh
                              ? "#B84A39"
                              : entry.isOutlierLow
                              ? "#2E6B4F"
                              : "#2D4B73"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. OPPORTUNITIES & CATEGORY SHIFTS */}
          {/* ========================================================================= */}
          <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-stamp-indigo" />
                <h2 className="font-display text-base font-bold text-ink-text">
                  Category Shifts &amp; Points Worth a Look
                </h2>
              </div>
              <span className="text-[11px] font-mono text-muted-text">
                vs Prior Equivalent Period
              </span>
            </div>

            {/* AI Opportunities */}
            {narrative?.opportunities && narrative.opportunities.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {narrative.opportunities.map((opp, idx) => (
                  <div
                    key={idx}
                    className="rounded-[6px] border border-fiber-line bg-paper-bg p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink-text flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-passbook-gold" />
                        {opp.title}
                      </span>
                      {opp.category && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] border border-fiber-line bg-card-bg text-muted-text">
                          {opp.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-sans text-muted-text leading-relaxed">
                      {opp.narrative}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Ruled Category Deltas Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-fiber-line text-muted-text text-[10px] uppercase">
                    <th className="pb-2 font-normal">Category</th>
                    <th className="pb-2 font-normal text-right">Current Spend</th>
                    <th className="pb-2 font-normal text-right">Prior Spend</th>
                    <th className="pb-2 font-normal text-right">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fiber-line/60">
                  {stats.categoryDeltas.slice(0, 6).map((cd, idx) => (
                    <tr key={idx} className="hover:bg-paper-bg/40 transition-colors">
                      <td className="py-2.5 font-bold text-ink-text">{cd.category}</td>
                      <td className="py-2.5 text-right">{formatCurrency(cd.currentSpend, currency)}</td>
                      <td className="py-2.5 text-right text-muted-text">
                        {formatCurrency(cd.priorSpend, currency)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`inline-flex items-center gap-0.5 font-bold ${
                            cd.changePercent > 0
                              ? "text-rule-red"
                              : cd.changePercent < 0
                              ? "text-stamp-emerald"
                              : "text-muted-text"
                          }`}
                        >
                          {cd.changePercent > 0 ? "+" : ""}
                          {cd.changePercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 6. NOTABLE OUTLIER TRANSACTIONS */}
          {/* ========================================================================= */}
          {stats.topOutliers && stats.topOutliers.length > 0 && (
            <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 sm:p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-stamp-indigo" />
                  <h2 className="font-display text-base font-bold text-ink-text">
                    Largest Transactions This Period
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-muted-text">Top Outliers</span>
              </div>

              <div className="space-y-2 pt-1 font-mono text-xs">
                {stats.topOutliers.map((tx, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-[4px] border border-fiber-line/80 bg-paper-bg"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink-text">{tx.description}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] border border-fiber-line bg-card-bg text-muted-text">
                          {tx.category}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-text">{tx.date}</span>
                    </div>
                    <span className="font-bold text-rule-red text-sm">
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 7. FOOTER DISCLAIMER */}
          {/* ========================================================================= */}
          <div className="rounded-[6px] border border-fiber-line/60 bg-card-bg/40 p-3.5 text-center text-[11px] font-sans text-muted-text">
            <p>
              Informational analysis computed from your recorded ledger entries. FinChat does not provide formal investment or financial advice.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
