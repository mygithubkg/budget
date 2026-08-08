"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions";
import { useFriends } from "@/hooks/useFriends";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { TrendsView } from "@/components/dashboard/TrendsView";
import { CategoriesView } from "@/components/dashboard/CategoriesView";
import { MarketsView } from "@/components/dashboard/MarketsView";
import { MobileDashboardView } from "@/components/mobile/MobileDashboardView";
import MaterialIcon from "@/components/ui/MaterialIcon";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Users,
  MessageSquare,
  Trash2,
  Calendar,
  Tag,
  ArrowRight,
  Plus,
  LayoutDashboard,
  TrendingUp,
  PieChart as PieChartIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format, isSameMonth } from "date-fns";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const { userProfile } = useAuth();
  const { data: transactions = [], isLoading: isTransLoading } = useTransactions();
  const { data: friends = [], isLoading: isFriendsLoading } = useFriends();
  const deleteMutation = useDeleteTransaction();

  const currency = userProfile?.currency || "INR";
  const now = useMemo(() => new Date(), []);

  // Computations
  const totalIncomeAllTime = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenseAllTime = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);

  const currentTotalBalance = totalIncomeAllTime - totalExpenseAllTime;

  // This Month computations
  const thisMonthTrans = transactions.filter((t) =>
    isSameMonth(t.date instanceof Date ? t.date : new Date(t.date as any), now)
  );
  const thisMonthIncome = thisMonthTrans
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const thisMonthExpense = thisMonthTrans
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + (t.userShare ?? t.amount), 0);

  const savingsRate =
    thisMonthIncome > 0
      ? Math.round(((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100)
      : 0;

  // Friends net balance
  const friendsNet = friends.reduce((acc, f) => acc + (f.balance || 0), 0);

  const handleDelete = async (t: any) => {
    if (confirm(`Delete ledger entry "${t.description}"?`)) {
      try {
        await deleteMutation.mutateAsync(t);
        toast.success("Entry removed from register");
      } catch (err: any) {
        toast.error("Failed to delete entry");
      }
    }
  };

  const isLoading = isTransLoading || isFriendsLoading;

  const handleTabChange = (tabKey: string) => {
    router.replace(`/dashboard?tab=${tabKey}`, { scroll: false });
  };

  return (
    <>
      {/* ── Mobile UI v3 (<640px) ── */}
      <div className="block sm:hidden">
        <MobileDashboardView
          transactions={transactions}
          friends={friends}
          currency={currency}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onDeleteTransaction={handleDelete}
          userProfile={userProfile}
        />
      </div>

      {/* ── Desktop Ledger (>=640px) ── */}
      <div className="hidden sm:block flex-1 space-y-6 p-6 lg:p-8 max-w-6xl mx-auto text-on-surface">
        {/* Top Segmented Sub-Tab Bar */}
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
          <div className="flex rounded-2xl border border-outline-variant/40 bg-surface-container-low p-1 text-xs font-jetbrains-mono gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => handleTabChange("overview")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap font-medium ${
                activeTab === "overview"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
              }`}
            >
              <MaterialIcon name="dashboard" size={16} fill={activeTab === "overview"} />
              <span>Overview</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("trends")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap font-medium ${
                activeTab === "trends"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
              }`}
            >
              <MaterialIcon name="trending_up" size={16} fill={activeTab === "trends"} />
              <span>Trends</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("categories")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap font-medium ${
                activeTab === "categories"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
              }`}
            >
              <MaterialIcon name="pie_chart" size={16} fill={activeTab === "categories"} />
              <span>Categories</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("markets")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap font-medium ${
                activeTab === "markets"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
              }`}
            >
              <MaterialIcon name="monitoring" size={16} fill={activeTab === "markets"} />
              <span>Markets</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-jetbrains-mono text-on-surface-variant">
            <span>Period:</span>
            <span className="px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant/40 font-semibold text-on-surface">
              {format(now, "MMMM yyyy")}
            </span>
          </div>
        </div>

        {activeTab === "trends" ? (
          <TrendsView />
        ) : activeTab === "categories" ? (
          <CategoriesView />
        ) : activeTab === "markets" ? (
          <MarketsView />
        ) : (
          /* ── OVERVIEW — Bento Grid Layout ── */
          <div className="space-y-6">
            {/* Bento Grid Top Section: Hero (2 cols) + 2 Stat Cards (1 col) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* ── Hero Balance Card (Spans 2 Columns) ── */}
              <div className="lg:col-span-2 relative overflow-hidden rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 sm:p-8 desktop-card-hover group">
                {/* Sheen & Ambient Glow */}
                <div
                  className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full blur-3xl opacity-30 transition-opacity"
                  style={{
                    backgroundColor: currentTotalBalance >= 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
                  }}
                />

                <div className="relative flex flex-col justify-between h-full min-h-[200px] gap-6">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-jetbrains-mono text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Net Balance
                      </span>
                      <span
                        className={`font-jetbrains-mono text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                          currentTotalBalance >= 0
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-error/30 bg-error/10 text-error"
                        }`}
                      >
                        {currentTotalBalance >= 0 ? "In Credit" : "In Debit"}
                      </span>
                    </div>

                    {/* Prominent JetBrains Mono Balance */}
                    <div className="flex items-baseline gap-3 mt-3">
                      <span
                        className={`font-jetbrains-mono font-bold tracking-tight text-4xl sm:text-5xl ${
                          currentTotalBalance >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-error"
                        }`}
                      >
                        {currentTotalBalance >= 0 ? "+" : "−"}
                        {formatCurrency(Math.abs(currentTotalBalance), currency)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-sans text-on-surface-variant">
                      Cumulative income minus personal expenditure · {userProfile?.displayName || "Primary Account"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Link
                      href="/chat"
                      className="inline-flex items-center gap-2 rounded-2xl bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 text-xs font-jetbrains-mono font-bold tracking-wide transition-all shadow-md shadow-primary/20"
                    >
                      <MaterialIcon name="add_circle" size={16} className="text-on-primary" />
                      <span>Add Entry</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleTabChange("trends")}
                      className="inline-flex items-center gap-2 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-4 py-2.5 text-xs font-jetbrains-mono font-medium transition-all"
                    >
                      <MaterialIcon name="insights" size={16} />
                      <span>View Trends</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Stat Cards Column Beside Hero ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <StatsCard
                  title="This Month Income"
                  value={`+${formatCurrency(thisMonthIncome, currency)}`}
                  subtitle={format(now, "MMMM yyyy")}
                  icon={ArrowUpRight}
                  type="income"
                />
                <StatsCard
                  title="This Month Expense"
                  value={`−${formatCurrency(thisMonthExpense, currency)}`}
                  subtitle="Personal net spend"
                  icon={ArrowDownRight}
                  type="expense"
                />
              </div>
            </div>

            {/* Bento Grid Row 2: Savings Rate + Friends Net + Category Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StatsCard
                title="Monthly Savings Rate"
                value={`${savingsRate}%`}
                subtitle={savingsRate > 0 ? `${savingsRate}% of income saved this month` : "No savings recorded"}
                icon={PiggyBank}
                type="neutral"
              />
              <StatsCard
                title="Friend Debts Net"
                value={`${friendsNet >= 0 ? "+" : "−"}${formatCurrency(Math.abs(friendsNet), currency)}`}
                subtitle={
                  friendsNet > 0
                    ? "You are owed by friends"
                    : friendsNet < 0
                    ? "You owe friends"
                    : "All friend ledgers settled"
                }
                icon={Users}
                type={friendsNet >= 0 ? "income" : "expense"}
              />
              <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-5 desktop-card-hover">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-jetbrains-mono text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant truncate">
                    Categories
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTabChange("categories")}
                    className="text-[11px] font-jetbrains-mono font-medium text-primary hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-2 mt-2">
                  {transactions.slice(0, 3).map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs font-sans">
                      <span className="text-on-surface-variant truncate max-w-[120px]">{t.category || "General"}</span>
                      <span className="font-jetbrains-mono font-bold text-on-surface">
                        {formatCurrency(t.userShare ?? t.amount, currency)}
                      </span>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-xs text-on-surface-variant font-sans py-2">No category spend recorded</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Row 3: Transactions Ledger Table ── */}
            <div className="rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container overflow-hidden desktop-card-hover">
              <div className="p-5 border-b border-outline-variant/40 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-on-surface">
                    Recent Ledger Entries
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Itemized chronological journal entries
                  </p>
                </div>
                <Link
                  href="/chat"
                  className="flex items-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-xs font-jetbrains-mono font-semibold text-primary transition-colors"
                >
                  <MaterialIcon name="add" size={16} />
                  <span>Add Entry</span>
                </Link>
              </div>

              {isLoading ? (
                <div className="p-8 text-center text-xs font-jetbrains-mono text-on-surface-variant animate-pulse">
                  Loading ledger entries...
                </div>
              ) : transactions.length === 0 ? (
                <EmptyState
                  title="Your Ledger is Empty"
                  description="Begin typing, speaking, or photographing receipts in the AI Register to record transactions."
                  actionText="Open AI Register"
                  actionHref="/chat"
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-jetbrains-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/40 text-on-surface-variant text-[10px] uppercase bg-surface-container-low/60">
                        <th className="py-3 px-5 font-medium">Date</th>
                        <th className="py-3 px-5 font-medium">Description</th>
                        <th className="py-3 px-5 font-medium">Category</th>
                        <th className="py-3 px-5 font-medium text-right">Amount</th>
                        <th className="py-3 px-5 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {transactions.slice(0, 15).map((t) => {
                        const isExpense = t.type === "expense";
                        const effectiveAmount = t.userShare ?? t.amount;
                        const dateObj =
                          t.date instanceof Date
                            ? t.date
                            : typeof (t.date as any)?.toDate === "function"
                            ? (t.date as any).toDate()
                            : new Date(t.date as any);

                        return (
                          <tr
                            key={t.id}
                            className="desktop-row-hover transition-colors group cursor-default"
                          >
                            <td className="py-3.5 px-5 text-on-surface-variant whitespace-nowrap">
                              {format(dateObj, "yyyy-MM-dd")}
                            </td>
                            <td className="py-3.5 px-5 font-semibold text-on-surface font-sans">
                              {t.description}
                              {t.splits && t.splits.length > 0 && (
                                <span className="ml-2 text-[10px] font-jetbrains-mono font-medium text-primary border border-primary/30 px-2 py-0.5 rounded-full bg-primary/10">
                                  Split
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="text-[10px] px-2.5 py-1 rounded-lg border border-outline-variant/60 bg-surface-container-high text-on-surface-variant font-medium">
                                {t.category || "General"}
                              </span>
                            </td>
                            <td
                              className={`py-3.5 px-5 text-right font-bold whitespace-nowrap ${
                                isExpense
                                  ? "text-error"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {isExpense ? "−" : "+"}
                              {formatCurrency(effectiveAmount, currency)}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDelete(t)}
                                className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-error/10"
                                title="Delete entry"
                              >
                                <MaterialIcon name="delete" size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}


