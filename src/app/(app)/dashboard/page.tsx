"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions";
import { useFriends } from "@/hooks/useFriends";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format, isSameMonth } from "date-fns";
import { toast } from "sonner";

export default function DashboardPage() {
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

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto text-ink-text">
      {/* Top Display: Balance Figure in Fraunces Display */}
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

      {/* 4 KPI Quick-Stat Cards: Mobile Snap Carousel -> Desktop 4-col Grid */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        <div className="snap-start min-w-[240px] sm:min-w-0">
          <StatsCard
            title="This Month Income"
            value={`+${formatCurrency(thisMonthIncome, currency)}`}
            subtitle={format(now, "MMMM yyyy")}
            icon={ArrowUpRight}
            type="income"
          />
        </div>
        <div className="snap-start min-w-[240px] sm:min-w-0">
          <StatsCard
            title="This Month Expense"
            value={`−${formatCurrency(thisMonthExpense, currency)}`}
            subtitle="Personal net spend"
            icon={ArrowDownRight}
            type="expense"
          />
        </div>
        <div className="snap-start min-w-[240px] sm:min-w-0">
          <StatsCard
            title="Savings Ratio"
            value={`${savingsRate}%`}
            subtitle={
              thisMonthIncome > 0
                ? `${formatCurrency(thisMonthIncome - thisMonthExpense, currency)} net saved`
                : "No income logged this month"
            }
            icon={PiggyBank}
            type="gold"
          />
        </div>
        <div className="snap-start min-w-[240px] sm:min-w-0">
          <StatsCard
            title="Friend Balances"
            value={`${friendsNet >= 0 ? "+" : "−"}${formatCurrency(Math.abs(friendsNet), currency)}`}
            subtitle={friendsNet >= 0 ? "Owed to you overall" : "You owe friends overall"}
            icon={Users}
            type={friendsNet >= 0 ? "gold" : "expense"}
          />
        </div>
      </div>

      {/* Cashflow Bar & Friend Debts */}
      {!isLoading && transactions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Cashflow Ruled Card */}
          <div className="md:col-span-2 rounded-[8px] border border-fiber-line bg-card-bg p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
              <div>
                <h2 className="font-display text-base font-bold text-ink-text">
                  Monthly Cashflow
                </h2>
                <p className="text-xs font-sans text-muted-text">
                  Income vs Expenses for {format(now, "MMMM yyyy")}
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase text-muted-text border border-fiber-line px-2 py-0.5 rounded-[3px]">
                {format(now, "MMM yyyy")}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-passbook-gold">
                  + Income: {formatCurrency(thisMonthIncome, currency)}
                </span>
                <span className="text-rule-red">
                  − Expense: {formatCurrency(thisMonthExpense, currency)}
                </span>
              </div>

              {/* Progress Line */}
              <div className="flex h-2 w-full overflow-hidden rounded-[2px] bg-paper-bg border border-fiber-line">
                <div
                  className="h-full bg-passbook-gold transition-all duration-300"
                  style={{
                    width: `${
                      thisMonthIncome + thisMonthExpense > 0
                        ? (thisMonthIncome / (thisMonthIncome + thisMonthExpense)) * 100
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="h-full bg-rule-red transition-all duration-300"
                  style={{
                    width: `${
                      thisMonthIncome + thisMonthExpense > 0
                        ? (thisMonthExpense / (thisMonthIncome + thisMonthExpense)) * 100
                        : 50
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-fiber-line">
              <span className="text-muted-text">Net Monthly Result:</span>
              <span
                className={`font-bold ${
                  thisMonthIncome - thisMonthExpense >= 0
                    ? "text-passbook-gold"
                    : "text-rule-red"
                }`}
              >
                {thisMonthIncome - thisMonthExpense >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(thisMonthIncome - thisMonthExpense), currency)}
              </span>
            </div>
          </div>

          {/* Friend Debt Summary Card */}
          <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 flex flex-col justify-between space-y-3 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
                <h2 className="font-display text-base font-bold text-ink-text">
                  Friend Ledger
                </h2>
                <Link
                  href="/dashboard/friends"
                  className="text-xs font-mono text-stamp-indigo hover:underline"
                >
                  View All →
                </Link>
              </div>
              <div className="mt-3">
                <span className="font-mono text-2xl font-bold text-ink-text">
                  {friendsNet >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(friendsNet), currency)}
                </span>
                <p className="text-xs font-sans text-muted-text pt-1">
                  {friendsNet > 0
                    ? "Friends owe you money overall."
                    : friendsNet < 0
                    ? "You owe friends money overall."
                    : "All friend ledgers are settled."}
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/friends"
              className="w-full text-center rounded-[4px] border border-fiber-line bg-paper-bg hover:border-stamp-indigo py-2 text-xs font-mono uppercase font-bold text-ink-text transition-colors"
            >
              Settle Balances
            </Link>
          </div>
        </div>
      )}

      {/* Ruled Transaction History List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-fiber-line pb-2">
          <h2 className="font-display text-lg font-bold text-ink-text">
            Ruled Account Entries
          </h2>
          {transactions.length > 5 && (
            <Link
              href="/dashboard/trends"
              className="text-xs font-mono text-stamp-indigo hover:underline flex items-center gap-1"
            >
              <span>Trends & Analysis</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-card-bg border border-fiber-line rounded-[6px] animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-[8px] border border-fiber-line bg-card-bg divide-y divide-fiber-line overflow-hidden shadow-sm">
            {transactions.slice(0, 15).map((t) => {
              const isIncome = t.type === "income";
              const transDate = t.date instanceof Date ? t.date : new Date(t.date as any);
              const formattedDate = format(transDate, "dd MMM yyyy");

              return (
                <div
                  key={t.id}
                  className="relative flex items-center justify-between py-3 px-4 transition-colors hover:bg-paper-bg/60 group"
                >
                  {/* Red / Gold margin rule on the left edge */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[2.5px]"
                    style={{
                      backgroundColor: isIncome ? "var(--passbook-gold)" : "var(--rule-red)",
                    }}
                  />

                  <div className="flex items-center gap-3 min-w-0 pl-1">
                    <div className="truncate">
                      <div className="font-semibold text-xs text-ink-text truncate">
                        {t.description}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-text pt-0.5">
                        <span className="uppercase px-1.5 py-0.2 border border-fiber-line rounded-[2px]">
                          {t.category}
                        </span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                        {t.splits && t.splits.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-stamp-indigo font-medium">
                              Split with {t.splits.length} friend{t.splits.length > 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`font-mono text-sm font-bold ${
                          isIncome ? "text-passbook-gold" : "text-ink-text"
                        }`}
                      >
                        {isIncome ? "+" : "−"}
                        {formatCurrency(t.amount, currency)}
                      </div>
                      {!isIncome && t.userShare !== t.amount && (
                        <div className="text-[10px] font-mono text-muted-text">
                          Share: {formatCurrency(t.userShare, currency)}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(t)}
                      className="text-muted-text/40 hover:text-rule-red p-1 rounded-[4px] hover:bg-paper-bg transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
