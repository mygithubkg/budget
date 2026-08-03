"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories, useAddCategory, useDeleteCategory } from "@/hooks/useCategories";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
  Sparkles,
  Tag,
  ArrowDownRight,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format, isSameMonth, subMonths } from "date-fns";
import { toast } from "sonner";

const CATEGORY_COLORS = [
  "#6366F1", // Indigo
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#8B5CF6", // Violet
  "#3B82F6", // Blue
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#64748B", // Slate
];

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
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
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
        toast.success(`Category "${result.name}" added successfully!`);
      }
      setNewCatName("");
    } catch (err: any) {
      toast.error(err.message || "Failed to add category");
    }
  };

  const handleDeleteCategory = async (categoryId?: string, isDefault?: boolean) => {
    if (isDefault) {
      toast.error("Default categories cannot be deleted.");
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
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Category Breakdown
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Analyze your spending distribution and manage custom categories.
          </p>
        </div>

        {/* Time filters */}
        <div className="flex items-center gap-2">
          <Button
            variant={timeFilter === "thisMonth" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeFilter("thisMonth")}
            className="text-xs"
          >
            This Month
          </Button>
          <Button
            variant={timeFilter === "lastMonth" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeFilter("lastMonth")}
            className="text-xs"
          >
            Last Month
          </Button>
          <Button
            variant={timeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeFilter("all")}
            className="text-xs"
          >
            All Time
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[380px] rounded-2xl" />
          <Skeleton className="h-[380px] rounded-2xl" />
        </div>
      ) : categoryStats.length === 0 ? (
        <EmptyState
          title="No expenses logged for this period"
          description="Log an expense in Chat to see your category breakdown and charts."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-12">
          {/* Donut Chart Card (5 cols) */}
          <Card className="md:col-span-5 border-border/80 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-primary" />
                <span>Spending Distribution</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Total Expenses: {formatCurrency(totalExpenseAmount, currency)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center pt-2">
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
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
                            <div className="rounded-xl border border-border bg-popover/95 p-2.5 text-xs shadow-xl backdrop-blur-md">
                              <p className="font-semibold text-foreground">{data.name}</p>
                              <p className="font-bold text-primary">
                                {formatCurrency(data.amount, currency)} ({data.percentage.toFixed(1)}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">
                    Total
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {formatCurrency(totalExpenseAmount, currency)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                Click any slice or list item to drill down into transactions
              </p>
            </CardContent>
          </Card>

          {/* Ranked Category List (7 cols) */}
          <Card className="md:col-span-7 border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">
                Top Categories by Spend
              </CardTitle>
              <CardDescription className="text-xs">
                Ranked by total expenditures in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryStats.map((cat) => (
                <div
                  key={cat.name}
                  onClick={() => setSelectedCategoryName(cat.name)}
                  className="group cursor-pointer rounded-xl border border-border/60 bg-card/60 p-3 transition-all hover:border-primary/40 hover:bg-card hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(cat.amount, currency)}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono w-12 text-right">
                        {cat.percentage.toFixed(1)}%
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Management Card (Custom Categories + 85% Dedup) */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>Manage Categories</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Custom categories feature intelligent 85% fuzzy deduplication to prevent near-duplicates.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
            <Input
              placeholder="New category name (e.g. Subscriptions)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="text-xs"
            />
            <Button
              type="submit"
              size="sm"
              variant="gradient"
              disabled={!newCatName.trim() || addCategoryMutation.isPending}
              className="gap-1 shrink-0 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </Button>
          </form>

          {/* List of all categories with default vs custom badges */}
          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((c) => (
              <div
                key={c.id || c.name}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs shadow-xs"
              >
                <Tag className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-foreground">{c.name}</span>
                {c.isDefault ? (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-1">
                    Default
                  </Badge>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c.id, c.isDefault)}
                    className="ml-1 text-muted-foreground hover:text-destructive p-0.5"
                    title="Delete custom category"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drill-down Modal for Category Transactions */}
      <Dialog
        open={!!selectedCategoryName}
        onOpenChange={(open) => !open && setSelectedCategoryName(null)}
      >
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <span>{selectedCategoryName}</span>
            </DialogTitle>
            <DialogDescription>
              All transactions logged under this category (
              {drilldownTransactions.length} transaction
              {drilldownTransactions.length === 1 ? "" : "s"})
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-2">
            {drilldownTransactions.length === 0 ? (
              <p className="text-center py-6 text-xs text-muted-foreground">
                No transactions found in this period.
              </p>
            ) : (
              drilldownTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-foreground">
                      {t.description}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-[11px] pt-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(t.date), "dd MMM yyyy")}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-rose-500 text-sm">
                      -{formatCurrency(t.amount, currency)}
                    </div>
                    {t.userShare !== t.amount && (
                      <div className="text-[10px] text-muted-foreground">
                        Your share: {formatCurrency(t.userShare, currency)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
