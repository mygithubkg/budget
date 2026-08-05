"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories, useAddCategory, useDeleteCategory } from "@/hooks/useCategories";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  PieChart as PieIcon,
  Plus,
  Trash2,
  Calendar,
  ChevronRight,
  Tag,
  Layers,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { CATEGORICAL_PALETTE } from "@/lib/constants";
import { format, isSameMonth, subMonths } from "date-fns";
import { toast } from "sonner";

export function CategoriesView() {
  const { userProfile } = useAuth();
  const { data: transactions = [], isLoading: isTransLoading } = useTransactions();
  const { data: categories = [], isLoading: isCatsLoading } = useCategories();
  const addCategoryMutation = useAddCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const [timeFilter, setTimeFilter] = useState<"thisMonth" | "lastMonth" | "all">("thisMonth");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");

  const currency = userProfile?.currency || "INR";
  const now = useMemo(() => new Date(), []);

  // Filter transactions by time
  const filteredExpenses = useMemo(() => {
    return transactions.filter((t) => {
      if (t.type !== "expense") return false;
      const d = t.date instanceof Date ? t.date : new Date(t.date as any);
      if (timeFilter === "thisMonth") return isSameMonth(d, now);
      if (timeFilter === "lastMonth") return isSameMonth(d, subMonths(now, 1));
      return true;
    });
  }, [transactions, timeFilter, now]);

  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);
  }, [filteredExpenses]);

  // Aggregate by Category
  const categoryStats = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();

    filteredExpenses.forEach((t) => {
      const cat = t.category || "General";
      const amt = t.userShare ?? t.amount;
      const existing = map.get(cat) || { amount: 0, count: 0 };
      map.set(cat, {
        amount: existing.amount + amt,
        count: existing.count + 1,
      });
    });

    const result = Array.from(map.entries()).map(([name, data]) => ({
      name,
      amount: data.amount,
      count: data.count,
      percentage: totalExpense > 0 ? Math.round((data.amount / totalExpense) * 100) : 0,
    }));

    // Sort descending by spend amount
    return result.sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalExpense]);

  const selectedCategoryTransactions = useMemo(() => {
    if (!selectedCategoryName) return [];
    return filteredExpenses.filter((t) => (t.category || "General") === selectedCategoryName);
  }, [filteredExpenses, selectedCategoryName]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await addCategoryMutation.mutateAsync(newCatName.trim());
      setNewCatName("");
      toast.success("Category created");
    } catch (err) {
      toast.error("Failed to create category");
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Delete category "${name}"? Existing transactions won't be deleted.`)) {
      try {
        await deleteCategoryMutation.mutateAsync(id);
        toast.success("Category deleted");
      } catch (err) {
        toast.error("Failed to delete category");
      }
    }
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-[4px] border border-fiber-line bg-card-bg p-2.5 shadow-md text-xs font-mono">
          <p className="font-bold text-ink-text pb-1">{data.name}</p>
          <p className="text-stamp-indigo">{formatCurrency(data.amount, currency)}</p>
          <p className="text-muted-text">{data.percentage}% of total spend</p>
        </div>
      );
    }
    return null;
  };

  const isLoading = isTransLoading || isCatsLoading;

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fiber-line pb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono uppercase text-muted-text hidden sm:inline">Timeframe:</span>
          <div className="flex rounded-[6px] border border-fiber-line bg-paper-bg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setTimeFilter("thisMonth")}
              className={`px-2.5 py-1 rounded-[4px] transition-colors ${
                timeFilter === "thisMonth"
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                  : "text-muted-text hover:text-ink-text"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("lastMonth")}
              className={`px-2.5 py-1 rounded-[4px] transition-colors ${
                timeFilter === "lastMonth"
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                  : "text-muted-text hover:text-ink-text"
              }`}
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter("all")}
              className={`px-2.5 py-1 rounded-[4px] transition-colors ${
                timeFilter === "all"
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                  : "text-muted-text hover:text-ink-text"
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Total Metric */}
        <div className="font-mono text-xs text-muted-text">
          <span>Total Outflow: </span>
          <span className="font-bold text-ink-text text-sm">
            {formatCurrency(totalExpense, currency)}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-72 rounded-[8px] border border-fiber-line bg-card-bg/60" />
          <div className="h-72 rounded-[8px] border border-fiber-line bg-card-bg/60" />
        </div>
      ) : categoryStats.length === 0 ? (
        <EmptyState
          title="No Category Expenses Recorded"
          description="Log purchases in the AI Register to see your expenses organized and categorized automatically."
          actionText="Open AI Register"
          actionHref="/chat"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Donut Chart & Category Distribution */}
          <div className="lg:col-span-5 rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xs space-y-4">
            <h2 className="font-display text-base font-bold text-ink-text flex items-center gap-2 border-b border-fiber-line pb-2.5">
              <PieIcon className="h-4 w-4 text-stamp-indigo" />
              Allocation Share
            </h2>

            <div className="h-60 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Pie
                    data={categoryStats}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {categoryStats.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]}
                        stroke="none"
                        className="cursor-pointer transition-opacity hover:opacity-85"
                        onClick={() =>
                          setSelectedCategoryName(
                            selectedCategoryName === entry.name ? null : entry.name
                          )
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top legend breakdown */}
            <div className="space-y-1.5 pt-1">
              {categoryStats.slice(0, 5).map((cat, idx) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() =>
                    setSelectedCategoryName(
                      selectedCategoryName === cat.name ? null : cat.name
                    )
                  }
                  className={`w-full flex items-center justify-between p-2 rounded-[4px] text-xs font-mono transition-colors ${
                    selectedCategoryName === cat.name
                      ? "bg-stamp-indigo/10 border border-stamp-indigo/30"
                      : "hover:bg-paper-bg"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: CATEGORICAL_PALETTE[idx % CATEGORICAL_PALETTE.length],
                      }}
                    />
                    <span className="font-bold text-ink-text">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(cat.amount, currency)}</span>
                    <span className="text-muted-text text-[10px]">({cat.percentage}%)</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category Ruled List / Drilldown */}
          <div className="lg:col-span-7 rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
              <h2 className="font-display text-base font-bold text-ink-text flex items-center gap-2">
                <Layers className="h-4 w-4 text-stamp-indigo" />
                {selectedCategoryName ? `${selectedCategoryName} Entries` : "Category Breakdown"}
              </h2>
              {selectedCategoryName && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryName(null)}
                  className="flex items-center gap-1 text-[11px] font-mono text-stamp-indigo hover:underline"
                >
                  <X className="h-3 w-3" /> Show All
                </button>
              )}
            </div>

            {selectedCategoryName ? (
              /* Drilldown list for selected category */
              <div className="space-y-2 font-mono text-xs">
                {selectedCategoryTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 rounded-[4px] border border-fiber-line/80 bg-paper-bg"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-ink-text">{tx.description}</p>
                      <span className="text-[10px] text-muted-text">
                        {format(tx.date instanceof Date ? tx.date : new Date(tx.date as any), "yyyy-MM-dd")}
                      </span>
                    </div>
                    <span className="font-bold text-rule-red">
                      {formatCurrency(tx.userShare ?? tx.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* All categories ruled table */
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-fiber-line text-muted-text text-[10px] uppercase">
                      <th className="pb-2 font-normal">Category</th>
                      <th className="pb-2 font-normal text-center">Count</th>
                      <th className="pb-2 font-normal text-right">Total Amount</th>
                      <th className="pb-2 font-normal text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fiber-line/60">
                    {categoryStats.map((cat, idx) => (
                      <tr
                        key={cat.name}
                        onClick={() => setSelectedCategoryName(cat.name)}
                        className="hover:bg-paper-bg/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 font-bold text-ink-text flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: CATEGORICAL_PALETTE[idx % CATEGORICAL_PALETTE.length],
                            }}
                          />
                          {cat.name}
                        </td>
                        <td className="py-2.5 text-center text-muted-text">{cat.count}</td>
                        <td className="py-2.5 text-right font-bold">
                          {formatCurrency(cat.amount, currency)}
                        </td>
                        <td className="py-2.5 text-right text-muted-text">{cat.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Custom Category Quick Add */}
            <form onSubmit={handleAddCategory} className="pt-3 border-t border-fiber-line flex gap-2">
              <input
                type="text"
                placeholder="New Category Name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-1.5 text-xs font-mono text-ink-text focus:outline-none focus:border-stamp-indigo"
              />
              <button
                type="submit"
                disabled={!newCatName.trim() || addCategoryMutation.isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[4px] bg-stamp-indigo text-[#EDE7D6] font-mono text-xs font-bold disabled:opacity-50 transition-opacity shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
