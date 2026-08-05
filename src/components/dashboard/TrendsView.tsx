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

export function TrendsView() {
  const { userProfile } = useAuth();
  const { data: transactions = [], isLoading } = useTransactions();

  const [dateRange, setDateRange] = useState<DateRangeType>("month");
  const [grouping, setGrouping] = useState<GroupingType>("day");
  const [chartType, setChartType] = useState<ChartType>("area");

  const currency = userProfile?.currency || "INR";
  const now = useMemo(() => new Date(), []);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = t.date instanceof Date ? t.date : new Date(t.date as any);
      if (dateRange === "week") return d >= subDays(now, 7);
      if (dateRange === "month") return d >= subMonths(now, 1);
      if (dateRange === "3months") return d >= subMonths(now, 3);
      return true;
    });
  }, [transactions, dateRange, now]);

  // Aggregate data for Chart
  const chartData = useMemo(() => {
    if (filteredTransactions.length === 0) return [];

    let start = subMonths(now, 1);
    if (dateRange === "week") start = subDays(now, 7);
    if (dateRange === "3months") start = subMonths(now, 3);
    if (dateRange === "all") {
      const dates = transactions.map((t) =>
        (t.date instanceof Date ? t.date : new Date(t.date as any)).getTime()
      );
      start = dates.length ? new Date(Math.min(...dates)) : subMonths(now, 1);
    }

    if (grouping === "day") {
      const days = eachDayOfInterval({ start, end: now });
      return days.map((day) => {
        const dayTrans = filteredTransactions.filter((t) => {
          const d = t.date instanceof Date ? t.date : new Date(t.date as any);
          return isSameDay(d, day);
        });

        const income = dayTrans
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        const expense = dayTrans
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);

        return {
          label: format(day, "MMM dd"),
          income,
          expense,
          net: income - expense,
        };
      });
    }

    if (grouping === "week") {
      const weeks = eachWeekOfInterval({ start, end: now });
      return weeks.map((week) => {
        const weekTrans = filteredTransactions.filter((t) => {
          const d = t.date instanceof Date ? t.date : new Date(t.date as any);
          return isSameWeek(d, week);
        });

        const income = weekTrans
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0);

        const expense = weekTrans
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);

        return {
          label: `Wk ${format(week, "dd MMM")}`,
          income,
          expense,
          net: income - expense,
        };
      });
    }

    // grouping === "month"
    const months = eachMonthOfInterval({ start, end: now });
    return months.map((month) => {
      const monthTrans = filteredTransactions.filter((t) => {
        const d = t.date instanceof Date ? t.date : new Date(t.date as any);
        return isSameMonth(d, month);
      });

      const income = monthTrans
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = monthTrans
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);

      return {
        label: format(month, "MMM yyyy"),
        income,
        expense,
        net: income - expense,
      };
    });
  }, [filteredTransactions, grouping, dateRange, now, transactions]);

  // Overall totals for selected date range
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);
  }, [filteredTransactions]);

  const netSavings = totalIncome - totalExpense;

  // Custom Recharts Tooltip styled as a physical register stamp
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-[4px] border border-fiber-line bg-card-bg p-3 shadow-md text-xs font-mono">
          <p className="font-bold text-ink-text pb-1 border-b border-fiber-line/60">{label}</p>
          <div className="pt-1.5 space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span style={{ color: entry.color }} className="font-medium">
                  {entry.name}:
                </span>
                <span className="font-bold">
                  {formatCurrency(entry.value, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar: Filters & Aggregation Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fiber-line pb-4">
        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase text-muted-text hidden sm:inline">Range:</span>
          <div className="flex rounded-[6px] border border-fiber-line bg-paper-bg p-0.5 text-xs font-mono">
            {(["week", "month", "3months", "all"] as DateRangeType[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`px-2.5 py-1 rounded-[4px] capitalize transition-colors ${
                  dateRange === r
                    ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                    : "text-muted-text hover:text-ink-text"
                }`}
              >
                {r === "3months" ? "90d" : r}
              </button>
            ))}
          </div>
        </div>

        {/* Grouping & Chart Type Selectors */}
        <div className="flex items-center gap-2">
          {/* Grouping */}
          <div className="flex rounded-[6px] border border-fiber-line bg-paper-bg p-0.5 text-xs font-mono">
            {(["day", "week", "month"] as GroupingType[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrouping(g)}
                className={`px-2.5 py-1 rounded-[4px] capitalize transition-colors ${
                  grouping === g
                    ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                    : "text-muted-text hover:text-ink-text"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Chart View Toggle */}
          <div className="flex rounded-[6px] border border-fiber-line bg-paper-bg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setChartType("area")}
              className={`px-2 py-1 rounded-[4px] transition-colors ${
                chartType === "area"
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                  : "text-muted-text hover:text-ink-text"
              }`}
              title="Area Chart"
            >
              Area
            </button>
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`px-2 py-1 rounded-[4px] transition-colors ${
                chartType === "bar"
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                  : "text-muted-text hover:text-ink-text"
              }`}
              title="Bar Chart"
            >
              Bar
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatsCard
          title="Period Income"
          value={`+${formatCurrency(totalIncome, currency)}`}
          icon={ArrowUpRight}
          subtitle="Total Received"
          type="income"
        />
        <StatsCard
          title="Period Outflow"
          value={`−${formatCurrency(totalExpense, currency)}`}
          icon={ArrowDownRight}
          subtitle="Total Expenses"
          type="expense"
        />
        <StatsCard
          title="Net Cashflow"
          value={`${netSavings >= 0 ? "+" : "−"}${formatCurrency(Math.abs(netSavings), currency)}`}
          icon={Flame}
          subtitle={netSavings >= 0 ? "Surplus Saved" : "Deficit Incurred"}
          type={netSavings >= 0 ? "income" : "expense"}
        />
      </div>

      {/* Main Chart Canvas */}
      {isLoading ? (
        <div className="h-80 rounded-[8px] border border-fiber-line bg-card-bg/60 animate-pulse" />
      ) : chartData.length === 0 ? (
        <EmptyState
          title="No Data in Selected Period"
          description="Record expenses in the AI Register to see your financial cashflow patterns plotted over time."
          actionText="Open AI Register"
          actionHref="/chat"
        />
      ) : (
        <div className="rounded-[8px] border border-fiber-line bg-card-bg p-4 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
            <h2 className="font-display text-base font-bold text-ink-text flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-stamp-indigo" />
              Cashflow Trajectory
            </h2>
            <span className="text-[11px] font-mono text-muted-text">
              {chartData.length} data points
            </span>
          </div>

          <div className="h-72 sm:h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2E6B4F" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2E6B4F" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B84A39" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#B84A39" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D5CEBA" opacity={0.3} />
                  <XAxis dataKey="label" stroke="#7A808A" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#7A808A"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#2E6B4F"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#incomeGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Expense"
                    stroke="#B84A39"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#expenseGrad)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D5CEBA" opacity={0.3} />
                  <XAxis dataKey="label" stroke="#7A808A" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#7A808A"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Bar dataKey="income" name="Income" fill="#2E6B4F" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#B84A39" radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
