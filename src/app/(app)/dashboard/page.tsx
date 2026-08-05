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
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto text-ink-text">
      {/* Top Segmented Sub-Tab Bar */}
      <div className="flex items-center justify-between border-b border-fiber-line pb-3">
        <div className="flex rounded-[6px] border border-fiber-line bg-paper-bg p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => handleTabChange("overview")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] transition-colors ${
              activeTab === "overview"
                ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("trends")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] transition-colors ${
              activeTab === "trends"
                ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Trends &amp; Charts</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("categories")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] transition-colors ${
              activeTab === "categories"
                ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <PieChartIcon className="h-3.5 w-3.5" />
            <span>Categories</span>
          </button>
        </div>

        <Link
          href="/chat"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] transition-colors shadow-xs"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>AI Register</span>
        </Link>
      </div>

      {activeTab === "trends" ? (
        <TrendsView />
      ) : activeTab === "categories" ? (
        <CategoriesView />
      ) : (
        /* Overview View */
        <div className="space-y-6">
          {/* Top Display: Balance Figure */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between border-b border-fiber-line pb-6 gap-4">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-text">
                Net Ledger Balance
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-ink-text">
                  {currentTotalBalance >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(currentTotalBalance), currency)}
                </span>
                <span
                  className={`font-mono text-xs font-bold uppercase px-2 py-0.5 border border-fiber-line rounded-[3px] ${
                    currentTotalBalance >= 0 ? "text-passbook-gold" : "text-rule-red"
                  }`}
                >
                  {currentTotalBalance >= 0 ? "In Credit" : "In Debit"}
                </span>
              </div>
              <p className="text-xs font-sans text-muted-text pt-1">
                All-time registered income minus expenses for {userProfile?.displayName || "Account"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/chat"
                className="inline-flex items-center gap-2 rounded-[6px] bg-stamp-indigo hover:bg-stamp-indigo/90 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] transition-colors shadow-sm"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Open Register</span>
              </Link>
            </div>
          </div>

          {/* 4 KPI Quick-Stat Cards */}
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            <div className="snap-start min-w-[240px] sm:min-w-0">
              <StatsCard
                title="This Month Income"
                amount={thisMonthIncome}
                currency={currency}
                icon={ArrowUpRight}
                trendLabel={format(now, "MMMM yyyy")}
                accent="emerald"
              />
            </div>
            <div className="snap-start min-w-[240px] sm:min-w-0">
              <StatsCard
                title="This Month Expense"
                amount={thisMonthExpense}
                currency={currency}
                icon={ArrowDownRight}
                trendLabel="Personal net spend"
                accent="red"
              />
            </div>
            <div className="snap-start min-w-[240px] sm:min-w-0">
              <StatsCard
                title="Monthly Savings Rate"
                amount={savingsRate}
                currency=""
                icon={PiggyBank}
                trendLabel={`${savingsRate}% of income saved`}
                accent="indigo"
              />
            </div>
            <div className="snap-start min-w-[240px] sm:min-w-0">
              <StatsCard
                title="Friend Debts Net"
                amount={friendsNet}
                currency={currency}
                icon={Users}
                trendLabel={
                  friendsNet > 0
                    ? "You are owed"
                    : friendsNet < 0
                    ? "You owe friends"
                    : "All debts settled"
                }
                accent={friendsNet >= 0 ? "emerald" : "red"}
              />
            </div>
          </div>

          {/* Transactions Ledger Table */}
          <div className="rounded-[8px] border border-fiber-line bg-card-bg shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-fiber-line flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-ink-text">
                  Recent Ledger Entries
                </h2>
                <p className="text-xs text-muted-text">
                  Itemized chronological journal entries
                </p>
              </div>
              <Link
                href="/chat"
                className="text-xs font-mono font-bold text-stamp-indigo hover:underline flex items-center gap-1"
              >
                <span>Add Entry</span>
                <ArrowRight className="h-3 w-3" />
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
                    <tr className="border-b border-fiber-line text-muted-text text-[10px] uppercase bg-paper-bg/50">
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
                          className="hover:bg-paper-bg/40 transition-colors group"
                        >
                          <td className="py-3 px-4 text-muted-text whitespace-nowrap">
                            {format(dateObj, "yyyy-MM-dd")}
                          </td>
                          <td className="py-3 px-4 font-bold text-ink-text">
                            {t.description}
                            {t.isSplit && (
                              <span className="ml-2 text-[10px] font-normal text-stamp-indigo border border-stamp-indigo/30 px-1.5 py-0.2 rounded-[2px] bg-stamp-indigo/5">
                                Split
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] px-2 py-0.5 rounded-[3px] border border-fiber-line bg-paper-bg text-muted-text">
                              {t.category || "General"}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                              isExpense ? "text-rule-red" : "text-stamp-emerald"
                            }`}
                          >
                            {isExpense ? "−" : "+"}
                            {formatCurrency(effectiveAmount, currency)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleDelete(t)}
                              className="text-muted-text hover:text-rule-red transition-colors p-1"
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
