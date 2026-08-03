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

export default function CategoriesPage() {
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

  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);
  }, [filteredExpenses]);

  // Aggregate category breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();

    filteredExpenses.forEach((t) => {
      const cat = t.category || "Miscellaneous";
      const amt = t.userShare ?? t.amount;
      map.set(cat, (map.get(cat) || 0) + amt);
    });

    const stats = Array.from(map.entries()).map(([name, amount], index) => {
      const percentage =
        totalExpenseAmount > 0 ? (amount / totalExpenseAmount) * 100 : 0;
      return {
        name,
        amount,
        percentage,
        color: CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length],
      };
    });

    return stats.sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalExpenseAmount]);

  // Transactions for active drilldown category
  const drilldownTransactions = useMemo(() => {
    if (!selectedCategoryName) return [];
    return filteredExpenses.filter((t) => t.category === selectedCategoryName);
  }, [filteredExpenses, selectedCategoryName]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const result = await addCategoryMutation.mutateAsync(newCatName.trim());
      if (result.isExisting) {
        toast.info(
          `Matched with existing category: "${result.name}" (85% similarity detected).`
        );
      } else {
        toast.success(`Category "${result.name}" added to register!`);
      }
      setNewCatName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add category");
    }
  };

  const handleDeleteCategory = async (categoryId?: string, isDefault?: boolean) => {
    if (isDefault) {
      toast.error("Standard ledger categories cannot be deleted.");
      return;
    }
    if (!categoryId) return;

    if (confirm("Are you sure you want to delete this custom category?")) {
      try {
        await deleteCategoryMutation.mutateAsync(categoryId);
        toast.success("Category deleted.");
      } catch (err: any) {
        toast.error("Failed to delete category");
      }
    }
  };

  const isLoading = isTransLoading || isCatsLoading;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto text-ink-text">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-fiber-line pb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
            Category Breakdown
          </h1>
          <p className="text-xs font-sans text-muted-text pt-0.5">
            Analyze your spending distribution and manage custom accounts.
          </p>
        </div>

        {/* Time filters */}
        <div className="flex rounded-[4px] border border-fiber-line bg-card-bg p-0.5 text-xs font-mono">
          {[
            { id: "thisMonth", label: "This Month" },
            { id: "lastMonth", label: "Last Month" },
            { id: "all", label: "All Time" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setTimeFilter(f.id as any)}
              className={`px-3 py-1 rounded-[3px] transition-colors ${
                timeFilter === f.id
                  ? "bg-stamp-indigo text-[#EDE7D6] font-bold"
                  : "text-muted-text hover:text-ink-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-[360px] bg-card-bg border border-fiber-line rounded-[8px] animate-pulse" />
          <div className="h-[360px] bg-card-bg border border-fiber-line rounded-[8px] animate-pulse" />
        </div>
      ) : categoryStats.length === 0 ? (
        <EmptyState
          title="No expenses logged for this period"
          description="Log an entry in the Chat register to see your category breakdown."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-12">
          {/* Donut Chart Card (5 cols) */}
          <div className="md:col-span-5 rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm flex flex-col">
            <div className="border-b border-fiber-line pb-3">
              <h2 className="font-display text-base font-bold text-ink-text flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-stamp-indigo" />
                <span>Spending Distribution</span>
              </h2>
              <p className="text-xs font-mono text-muted-text pt-0.5">
                Total Expenses: {formatCurrency(totalExpenseAmount, currency)}
              </p>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center pt-4">
              <div className="h-60 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {categoryStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          className="cursor-pointer transition-transform hover:scale-105"
                          onClick={() => setSelectedCategoryName(entry.name)}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-[6px] border border-fiber-line bg-card-bg p-2.5 text-xs shadow-md font-mono">
                              <p className="font-bold text-ink-text">{data.name}</p>
                              <p className="font-bold text-rule-red">
                                −{formatCurrency(data.amount, currency)} ({data.percentage.toFixed(1)}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-mono uppercase text-muted-text tracking-wider">
                    Total
                  </span>
                  <span className="font-mono text-sm font-bold text-ink-text">
                    {formatCurrency(totalExpenseAmount, currency)}
                  </span>
                </div>
              </div>

              <p className="text-[10px] font-mono text-muted-text mt-2 text-center">
                Click any category to inspect ledger entries
              </p>
            </div>
          </div>

          {/* Ranked Category List (7 cols) */}
          <div className="md:col-span-7 rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
            <div className="border-b border-fiber-line pb-3">
              <h2 className="font-display text-base font-bold text-ink-text">
                Ranked Ledger Categories
              </h2>
              <p className="text-xs font-sans text-muted-text">
                Ranked by total expenditures in the selected period
              </p>
            </div>

            <div className="divide-y divide-fiber-line">
              {categoryStats.map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => setSelectedCategoryName(cat.name)}
                  className="group cursor-pointer py-2.5 px-2 transition-colors hover:bg-paper-bg/60 flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-[2px] shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-xs text-ink-text">
                        {cat.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-ink-text">
                        {formatCurrency(cat.amount, currency)}
                      </span>
                      <span className="font-mono text-[11px] text-muted-text w-12 text-right">
                        {cat.percentage.toFixed(1)}%
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-text group-hover:text-ink-text transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-[2px] bg-paper-bg border border-fiber-line/60">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Management Card (Custom Categories + 85% Dedup) */}
      <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm space-y-4">
        <div className="border-b border-fiber-line pb-3">
          <h2 className="font-display text-base font-bold text-ink-text flex items-center gap-2">
            <Layers className="h-4 w-4 text-stamp-indigo" />
            <span>Manage Ledger Accounts</span>
          </h2>
          <p className="text-xs font-sans text-muted-text">
            Custom categories feature intelligent 85% fuzzy deduplication to prevent near-duplicates.
          </p>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
          <input
            placeholder="New category name (e.g. Subscriptions)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="flex-1 h-8 rounded-[4px] border border-fiber-line bg-paper-bg px-2.5 text-xs text-ink-text focus:border-stamp-indigo focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newCatName.trim() || addCategoryMutation.isPending}
            className="h-8 px-3.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] flex items-center gap-1 shrink-0 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add</span>
          </button>
        </form>

        {/* List of all categories with default vs custom badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((c) => (
            <div
              key={c.id || c.name}
              className="flex items-center gap-1.5 rounded-[4px] border border-fiber-line bg-paper-bg px-2.5 py-1 text-xs"
            >
              <Tag className="h-3 w-3 text-muted-text" />
              <span className="font-medium text-ink-text text-xs">{c.name}</span>
              {c.isDefault ? (
                <span className="text-[9px] font-mono uppercase text-muted-text px-1 py-0.2 border border-fiber-line rounded-[2px] ml-1">
                  Standard
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c.id, c.isDefault)}
                  className="ml-1 text-muted-text hover:text-rule-red p-0.5"
                  title="Delete custom category"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Drill-down Modal for Category Transactions */}
      {selectedCategoryName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xl space-y-3 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-stamp-indigo" />
                <h3 className="font-display text-base font-bold text-ink-text">
                  {selectedCategoryName} Entries
                </h3>
              </div>
              <button
                onClick={() => setSelectedCategoryName(null)}
                className="text-muted-text hover:text-ink-text p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-muted-text">
              {drilldownTransactions.length} recorded {drilldownTransactions.length === 1 ? "entry" : "entries"}
            </p>

            <div className="flex-1 overflow-y-auto divide-y divide-fiber-line pr-1">
              {drilldownTransactions.length === 0 ? (
                <p className="text-center py-6 text-xs text-muted-foreground font-mono">
                  No entries found in this period.
                </p>
              ) : (
                drilldownTransactions.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between py-2.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-ink-text">
                        {t.description}
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-text font-mono text-[10px] pt-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(t.date), "dd MMM yyyy")}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold">
                      <div className="text-rule-red">
                        −{formatCurrency(t.amount, currency)}
                      </div>
                      {t.userShare !== t.amount && (
                        <div className="text-[10px] text-muted-text font-normal">
                          Share: {formatCurrency(t.userShare, currency)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
