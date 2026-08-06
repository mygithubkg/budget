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
  Globe,
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
    <div className="flex-1 space-y-5 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto text-ink-text">
      {/* Top Segmented Sub-Tab Bar */}
      <div className="flex items-center justify-between border-b border-fiber-line pb-3">
        <div className="flex rounded-lg border border-fiber-line bg-paper-bg p-0.5 text-xs font-mono gap-0.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-stamp-red text-white font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("trends")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
              activeTab === "trends"
                ? "bg-stamp-red text-white font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Trends</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("categories")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
              activeTab === "categories"
                ? "bg-stamp-red text-white font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <PieChartIcon className="h-3.5 w-3.5" />
            <span>Categories</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("markets")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${
              activeTab === "markets"
                ? "bg-stamp-red text-white font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Markets</span>
          </button>
        </div>

        <Link
          href="/chat"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-stamp-red hover:bg-stamp-red/90 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-white transition-all shadow-xs hover:shadow-stamp"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>AI Register</span>
        </Link>
      </div>

      {activeTab === "trends" ? (
        <TrendsView />
      ) : activeTab === "categories" ? (
        <CategoriesView />
      ) : activeTab === "markets" ? (
        <MarketsView />
      ) : (
        /* ── OVERVIEW — Bento Grid Layout ── */
        <div className="space-y-4">
          {/* ── Row 1: Hero Balance Card (full width) ── */}
          <div
            className="relative overflow-hidden rounded-2xl p-6 sm:p-8 text-white"
            style={{ background: "var(--sig-gradient)" }}
          >
            {/* Decorative circles */}
            <div className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-4 bottom-0 h-32 w-32 rounded-full bg-white/[0.07]" />

            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-white/70">
                  Net Ledger Balance
                </span>

                {/* Gradient text balance — the hero moment */}
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="font-display font-bold tracking-tight text-white"
                    style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", lineHeight: 1.05 }}
                  >
                    {currentTotalBalance >= 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(currentTotalBalance), currency)}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      currentTotalBalance >= 0
                        ? "border-white/40 bg-white/15 text-white"
                        : "border-white/30 bg-white/10 text-white/80"
                    }`}
                  >
                    {currentTotalBalance >= 0 ? "In Credit" : "In Debit"}
                  </span>
                </div>

                <p className="mt-1.5 text-xs font-sans text-white/60">
                  All-time income minus expenses · {userProfile?.displayName || "Account"}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white transition-all"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Open Register</span>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Row 2: 4 KPI Stat Cards — bento 4-col grid ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
            <StatsCard
              title="Monthly Savings Rate"
              value={`${savingsRate}%`}
              subtitle={`${savingsRate}% of income saved`}
              icon={PiggyBank}
              type="neutral"
            />
            <StatsCard
              title="Friend Debts Net"
              value={`${friendsNet >= 0 ? "+" : "−"}${formatCurrency(Math.abs(friendsNet), currency)}`}
              subtitle={
                friendsNet > 0
                  ? "You are owed"
                  : friendsNet < 0
                  ? "You owe friends"
                  : "All debts settled"
              }
              icon={Users}
              type={friendsNet >= 0 ? "income" : "expense"}
            />
          </div>

          {/* ── Row 3: Transactions Ledger Table ── */}
          <div className="rounded-2xl border border-fiber-line bg-card-bg shadow-card dark:shadow-none dark:border-white/[0.06] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-fiber-line flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink-text">
                  Recent Ledger Entries
                </h2>
                <p className="text-xs text-muted-text mt-0.5">
                  Itemized chronological journal entries
                </p>
              </div>
              <Link
                href="/chat"
                className="flex items-center gap-1.5 rounded-lg bg-stamp-red/10 hover:bg-stamp-red/20 px-3 py-1.5 text-xs font-mono font-bold text-stamp-red transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Entry</span>
              </Link>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs font-mono text-muted-text animate-pulse">
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
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-fiber-line text-muted-text text-[10px] uppercase bg-paper-bg/60">
                      <th className="py-2.5 px-4 font-normal">Date</th>
                      <th className="py-2.5 px-4 font-normal">Description</th>
                      <th className="py-2.5 px-4 font-normal">Category</th>
                      <th className="py-2.5 px-4 font-normal text-right">Amount</th>
                      <th className="py-2.5 px-4 font-normal text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fiber-line/60">
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
                          className="hover:bg-paper-bg/50 dark:hover:bg-white/[0.03] transition-colors group"
                        >
                          <td className="py-3 px-4 text-muted-text whitespace-nowrap">
                            {format(dateObj, "yyyy-MM-dd")}
                          </td>
                          <td className="py-3 px-4 font-bold text-ink-text">
                            {t.description}
                            {t.splits && t.splits.length > 0 && (
                              <span className="ml-2 text-[10px] font-normal text-stamp-red border border-stamp-red/30 px-1.5 py-0.5 rounded bg-stamp-red/5">
                                Split
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] px-2 py-0.5 rounded border border-fiber-line bg-paper-bg text-muted-text">
                              {t.category || "General"}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                              isExpense ? "text-stamp-red" : "text-thrive-green"
                            }`}
                          >
                            {isExpense ? "−" : "+"}
                            {formatCurrency(effectiveAmount, currency)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDelete(t)}
                              className="text-muted-text hover:text-stamp-red transition-colors p-1 rounded opacity-0 group-hover:opacity-100"
                              title="Delete entry"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
  );
}


