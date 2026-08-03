"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Flame,
  BarChart2,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  format,
  subDays,
  subMonths,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameWeek,
  isSameMonth,
} from "date-fns";

type DateRangeType = "week" | "month" | "3months" | "all";
type GroupingType = "day" | "week" | "month";
type ChartType = "area" | "bar";

export default function TrendsPage() {
  const { userProfile } = useAuth();
  const { data: transactions = [], isLoading } = useTransactions();

  const [dateRange, setDateRange] = useState<DateRangeType>("month");
  const [grouping, setGrouping] = useState<GroupingType>("day");
  const [chartType, setChartType] = useState<ChartType>("area");

  const currency = userProfile?.currency || "INR";
  const now = useMemo(() => new Date(), []);

  // Filter transactions by selected date range
  const filteredTransactions = useMemo(() => {
    let cutoff: Date | null = null;
    if (dateRange === "week") cutoff = subDays(now, 7);
    else if (dateRange === "month") cutoff = subDays(now, 30);
    else if (dateRange === "3months") cutoff = subMonths(now, 3);

    if (!cutoff) return transactions;
    return transactions.filter((t) => (t.date instanceof Date ? t.date : new Date(t.date as any)) >= cutoff!);
  }, [transactions, dateRange, now]);

  // Aggregate time series for charts based on grouping
  const chartData = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    let startDate: Date;
    if (dateRange === "week") startDate = subDays(now, 7);
    else if (dateRange === "month") startDate = subDays(now, 30);
    else if (dateRange === "3months") startDate = subMonths(now, 3);
    else {
      const oldest = filteredTransactions.reduce(
        (min, t) => {
          const d = t.date instanceof Date ? t.date : new Date(t.date as any);
          return d < min ? d : min;
        },
        new Date()
      );
      startDate = oldest;
    }

    if (grouping === "day") {
      const days = eachDayOfInterval({ start: startDate, end: now });
      return days.map((day) => {
        const dayTrans = filteredTransactions.filter((t) =>
          isSameDay(t.date instanceof Date ? t.date : new Date(t.date as any), day)
        );
        const expense = dayTrans
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);
        const income = dayTrans
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          label: format(day, "dd MMM"),
          expense,
          income,
          net: income - expense,
        };
      });
    }

    if (grouping === "week") {
      const weeks = eachWeekOfInterval({ start: startDate, end: now });
      return weeks.map((week) => {
        const weekTrans = filteredTransactions.filter((t) =>
          isSameWeek(t.date instanceof Date ? t.date : new Date(t.date as any), week)
        );
        const expense = weekTrans
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);
        const income = weekTrans
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          label: `Wk ${format(week, "dd MMM")}`,
          expense,
          income,
          net: income - expense,
        };
      });
    }

    // month
    const months = eachMonthOfInterval({ start: startDate, end: now });
    return months.map((month) => {
      const monthTrans = filteredTransactions.filter((t) =>
        isSameMonth(t.date instanceof Date ? t.date : new Date(t.date as any), month)
      );
      const expense = monthTrans
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);
      const income = monthTrans
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        label: format(month, "MMM yyyy"),
        expense,
        income,
        net: income - expense,
      };
    });
  }, [filteredTransactions, dateRange, grouping, now]);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const averagePerUnit =
    chartData.length > 0 ? Math.round(totalExpense / chartData.length) : 0;

  const highestSpendingUnit = chartData.reduce(
    (max, item) => (item.expense > max.expense ? item : max),
    { label: "N/A", expense: 0 }
  );

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto text-ink-text">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-fiber-line pb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
            Register Trends & Flow
          </h1>
          <p className="text-xs font-sans text-muted-text pt-0.5">
            Visualize income, expenses, and cashflow patterns over time.
          </p>
        </div>

        {/* Range and Grouping selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Range Buttons */}
          <div className="flex rounded-[4px] border border-fiber-line bg-card-bg p-0.5 text-xs font-mono">
            {[
              { id: "week", label: "7 Days" },
              { id: "month", label: "30 Days" },
              { id: "3months", label: "3 Months" },
              { id: "all", label: "All Time" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setDateRange(r.id as DateRangeType)}
                className={`px-2.5 py-1 rounded-[3px] transition-colors ${
                  dateRange === r.id
                    ? "bg-stamp-indigo text-[#EDE7D6] font-bold"
                    : "text-muted-text hover:text-ink-text"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Grouping Buttons */}
          <div className="flex rounded-[4px] border border-fiber-line bg-card-bg p-0.5 text-xs font-mono">
            {[
              { id: "day", label: "Day" },
              { id: "week", label: "Week" },
              { id: "month", label: "Month" },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => setGrouping(g.id as GroupingType)}
                className={`px-2.5 py-1 rounded-[3px] transition-colors ${
                  grouping === g.id
                    ? "bg-stamp-indigo text-[#EDE7D6] font-bold"
                    : "text-muted-text hover:text-ink-text"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        <div className="snap-start min-w-[220px] sm:min-w-0">
          <StatsCard
            title="Period Spend"
            value={`−${formatCurrency(totalExpense, currency)}`}
            subtitle="Personal expenses in period"
            icon={ArrowDownRight}
            type="expense"
          />
        </div>
        <div className="snap-start min-w-[220px] sm:min-w-0">
          <StatsCard
            title="Period Income"
            value={`+${formatCurrency(totalIncome, currency)}`}
            subtitle="Total earnings in period"
            icon={ArrowUpRight}
            type="income"
          />
        </div>
        <div className="snap-start min-w-[220px] sm:min-w-0">
          <StatsCard
            title={`Avg / ${grouping.toUpperCase()}`}
            value={formatCurrency(averagePerUnit, currency)}
            subtitle={`Average over ${chartData.length} units`}
            icon={BarChart2}
            type="gold"
          />
        </div>
        <div className="snap-start min-w-[220px] sm:min-w-0">
          <StatsCard
            title="Peak Period"
            value={formatCurrency(highestSpendingUnit.expense, currency)}
            subtitle={highestSpendingUnit.label}
            icon={Flame}
            type="expense"
          />
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-fiber-line pb-3">
          <div>
            <h2 className="font-display text-base font-bold text-ink-text">
              Income vs Expense Flow
            </h2>
            <p className="text-xs font-sans text-muted-text">
              Comparing money in vs out grouped by {grouping}
            </p>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setChartType("area")}
              className={`px-2.5 py-1 rounded-[3px] border border-fiber-line transition-colors ${
                chartType === "area"
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold"
                  : "bg-paper-bg text-muted-text hover:text-ink-text"
              }`}
            >
              Area View
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-2.5 py-1 rounded-[3px] border border-fiber-line transition-colors ${
                chartType === "bar"
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold"
                  : "bg-paper-bg text-muted-text hover:text-ink-text"
              }`}
            >
              Bar View
            </button>
          </div>
        </div>

        <div className="pt-2">
          {isLoading ? (
            <div className="h-[340px] bg-paper-bg border border-fiber-line rounded-[6px] animate-pulse" />
          ) : chartData.length === 0 ? (
            <EmptyState
              title="No trend data in this period"
              description="Log entries in the chat register to see your historical trend graph."
            />
          ) : (
            <div className="h-[340px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C47D2B" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#C47D2B" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B263E" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#8B263E" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)" }}
                      stroke="currentColor"
                      opacity={0.6}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)" }}
                      stroke="currentColor"
                      opacity={0.6}
                      tickLine={false}
                      tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-[6px] border border-fiber-line bg-card-bg p-3 text-xs shadow-md font-mono">
                              <p className="font-bold text-ink-text mb-1.5">{label}</p>
                              <div className="space-y-1">
                                <p className="flex items-center justify-between gap-4 text-passbook-gold font-medium">
                                  <span>Income:</span>
                                  <span>+{formatCurrency(Number(payload[0]?.value) || 0, currency)}</span>
                                </p>
                                <p className="flex items-center justify-between gap-4 text-rule-red font-medium">
                                  <span>Expense:</span>
                                  <span>−{formatCurrency(Number(payload[1]?.value) || 0, currency)}</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontFamily: "var(--font-ibm-plex-mono)" }}
                      formatter={(val) => <span className="capitalize text-xs font-mono">{val}</span>}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="#C47D2B"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#incomeGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="Expense"
                      stroke="#8B263E"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#expenseGrad)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)" }}
                      stroke="currentColor"
                      opacity={0.6}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fontFamily: "var(--font-ibm-plex-mono)" }}
                      stroke="currentColor"
                      opacity={0.6}
                      tickLine={false}
                      tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-[6px] border border-fiber-line bg-card-bg p-3 text-xs shadow-md font-mono">
                              <p className="font-bold text-ink-text mb-1.5">{label}</p>
                              <div className="space-y-1">
                                <p className="flex items-center justify-between gap-4 text-passbook-gold font-medium">
                                  <span>Income:</span>
                                  <span>+{formatCurrency(Number(payload[0]?.value) || 0, currency)}</span>
                                </p>
                                <p className="flex items-center justify-between gap-4 text-rule-red font-medium">
                                  <span>Expense:</span>
                                  <span>−{formatCurrency(Number(payload[1]?.value) || 0, currency)}</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "10px", fontSize: "11px", fontFamily: "var(--font-ibm-plex-mono)" }}
                      formatter={(val) => <span className="capitalize text-xs font-mono">{val}</span>}
                    />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="#C47D2B"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expense"
                      fill="#8B263E"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
