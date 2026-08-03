"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  TrendingUp,
  Calendar,
  DollarSign,
  Flame,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import {
  format,
  subDays,
  subMonths,
  startOfWeek,
  startOfMonth,
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
  const now = new Date();

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
      // Find oldest transaction date
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

    // grouping === "month"
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
  }, [filteredTransactions, dateRange, grouping]);

  // Statistics
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
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Financial Trends
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Visualize income, expenses, and cashflow patterns over time.
          </p>
        </div>

        {/* Range selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={dateRange}
            onValueChange={(v) => setDateRange(v as DateRangeType)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="week" className="text-xs">7 Days</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">30 Days</TabsTrigger>
              <TabsTrigger value="3months" className="text-xs">3 Months</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">All Time</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs
            value={grouping}
            onValueChange={(v) => setGrouping(v as GroupingType)}
          >
            <TabsList className="h-9">
              <TabsTrigger value="day" className="text-xs">Day</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Stats Summary */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Period Spend"
            value={formatCurrency(totalExpense, currency)}
            subtitle="Personal expenses in period"
            icon={ArrowDownRight}
            colorScheme="expense"
          />
          <StatsCard
            title="Total Period Income"
            value={formatCurrency(totalIncome, currency)}
            subtitle="Total earnings in period"
            icon={ArrowUpRight}
            colorScheme="income"
          />
          <StatsCard
            title={`Avg Spend / ${grouping.toUpperCase()}`}
            value={formatCurrency(averagePerUnit, currency)}
            subtitle={`Average across ${chartData.length} ${grouping}s`}
            icon={DollarSign}
            colorScheme="purple"
          />
          <StatsCard
            title="Highest Spending Period"
            value={formatCurrency(highestSpendingUnit.expense, currency)}
            subtitle={highestSpendingUnit.label}
            icon={Flame}
            colorScheme="amber"
          />
        </div>
      )}

      {/* Main Interactive Chart */}
      <Card className="border-border/80">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold">
                Income vs Expense Flow
              </CardTitle>
              <CardDescription className="text-xs">
                Comparing money in vs money out grouped by {grouping}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={chartType === "area" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setChartType("area")}
                className="h-8 text-xs font-semibold"
              >
                Area View
              </Button>
              <Button
                variant={chartType === "bar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className="h-8 text-xs font-semibold"
              >
                Bar View
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading ? (
            <Skeleton className="h-[360px] w-full rounded-xl" />
          ) : chartData.length === 0 ? (
            <EmptyState
              title="No trend data in this period"
              description="Log some transactions in the chat to see your historical trend graph."
            />
          ) : (
            <div className="h-[360px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "area" ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      opacity={0.6}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      opacity={0.6}
                      tickLine={false}
                      tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-xl border border-border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur-md">
                              <p className="font-bold text-foreground mb-1.5">{label}</p>
                              <div className="space-y-1">
                                <p className="flex items-center justify-between gap-4 text-emerald-500 font-medium">
                                  <span>Income:</span>
                                  <span>{formatCurrency(Number(payload[0]?.value) || 0, currency)}</span>
                                </p>
                                <p className="flex items-center justify-between gap-4 text-rose-500 font-medium">
                                  <span>Expense:</span>
                                  <span>{formatCurrency(Number(payload[1]?.value) || 0, currency)}</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
                      formatter={(val) => <span className="capitalize text-xs">{val}</span>}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#incomeGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="Expense"
                      stroke="#F43F5E"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#expenseGrad)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      opacity={0.6}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="currentColor"
                      opacity={0.6}
                      tickLine={false}
                      tickFormatter={(v) => `${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-xl border border-border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur-md">
                              <p className="font-bold text-foreground mb-1.5">{label}</p>
                              <div className="space-y-1">
                                <p className="flex items-center justify-between gap-4 text-emerald-500 font-medium">
                                  <span>Income:</span>
                                  <span>{formatCurrency(Number(payload[0]?.value) || 0, currency)}</span>
                                </p>
                                <p className="flex items-center justify-between gap-4 text-rose-500 font-medium">
                                  <span>Expense:</span>
                                  <span>{formatCurrency(Number(payload[1]?.value) || 0, currency)}</span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
                      formatter={(val) => <span className="capitalize text-xs">{val}</span>}
                    />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expense"
                      name="Expense"
                      fill="#F43F5E"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
