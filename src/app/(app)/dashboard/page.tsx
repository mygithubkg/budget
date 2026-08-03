"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions";
import { useFriends } from "@/hooks/useFriends";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  ChevronRight,
  ArrowRight,
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
  const now = new Date();

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
    if (confirm(`Delete transaction "${t.description}"?`)) {
      try {
        await deleteMutation.mutateAsync(t);
        toast.success("Transaction deleted");
      } catch (err: any) {
        toast.error("Failed to delete transaction");
      }
    }
  };

  const isLoading = isTransLoading || isFriendsLoading;

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Welcome Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Financial Overview
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Welcome back, {userProfile?.displayName || "there"}! Here is your current financial pulse.
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2 sm:pt-0">
          <Button asChild variant="gradient" className="gap-2 shadow-sm">
            <Link href="/chat">
              <MessageSquare className="h-4 w-4" />
              <span>Ask AI Chat</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Top KPI Stats */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Net Balance"
            value={formatCurrency(currentTotalBalance, currency)}
            subtitle="All-time income minus spend"
            icon={Wallet}
            colorScheme="primary"
          />
          <StatsCard
            title="This Month's Income"
            value={formatCurrency(thisMonthIncome, currency)}
            subtitle={format(now, "MMMM yyyy")}
            icon={ArrowUpRight}
            colorScheme="income"
          />
          <StatsCard
            title="This Month's Expense"
            value={formatCurrency(thisMonthExpense, currency)}
            subtitle="Your personal spend share"
            icon={ArrowDownRight}
            colorScheme="expense"
          />
          <StatsCard
            title="Savings Rate"
            value={`${savingsRate}%`}
            subtitle={
              thisMonthIncome > 0
                ? `${formatCurrency(thisMonthIncome - thisMonthExpense, currency)} saved`
                : "No income recorded this month"
            }
            icon={PiggyBank}
            colorScheme={savingsRate >= 20 ? "income" : "amber"}
          />
        </div>
      )}

      {/* Mid Section: Monthly Comparison Bar & Friends Net Owed */}
      {!isLoading && transactions.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Income vs Expense Bar Card */}
          <Card className="md:col-span-2 border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    This Month Cashflow
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Income vs Expense for {format(now, "MMMM yyyy")}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {format(now, "MMM yyyy")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Income:{" "}
                    {formatCurrency(thisMonthIncome, currency)}
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-500">
                    <ArrowDownRight className="h-3.5 w-3.5" /> Expenses:{" "}
                    {formatCurrency(thisMonthExpense, currency)}
                  </span>
                </div>

                {/* Progress Comparison Bar */}
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${
                        thisMonthIncome + thisMonthExpense > 0
                          ? Math.min(
                              100,
                              Math.max(
                                5,
                                (thisMonthIncome /
                                  (thisMonthIncome + thisMonthExpense)) *
                                  100
                              )
                            )
                          : 50
                      }%`,
                    }}
                  />
                  <div
                    className="h-full rounded-full bg-rose-500 transition-all duration-500 ml-1"
                    style={{
                      width: `${
                        thisMonthIncome + thisMonthExpense > 0
                          ? Math.min(
                              100,
                              Math.max(
                                5,
                                (thisMonthExpense /
                                  (thisMonthIncome + thisMonthExpense)) *
                                  100
                              )
                            )
                          : 50
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                <span>Net Monthly Savings:</span>
                <span
                  className={`font-bold ${
                    thisMonthIncome - thisMonthExpense >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {formatCurrency(thisMonthIncome - thisMonthExpense, currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Friends Debt Summary Card */}
          <Card className="border-border/80 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Friends Debt</span>
                </CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2">
                  <Link href="/dashboard/friends">
                    View all <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </Button>
              </div>
              <CardDescription className="text-xs">
                Net amount friends owe you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold">
                <span
                  className={
                    friendsNet > 0
                      ? "text-emerald-500"
                      : friendsNet < 0
                      ? "text-rose-500"
                      : "text-muted-foreground"
                  }
                >
                  {friendsNet > 0 ? "+" : ""}
                  {formatCurrency(friendsNet, currency)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {friendsNet > 0
                  ? "Friends owe you money overall."
                  : friendsNet < 0
                  ? "You owe friends money overall."
                  : "All friend balances are currently settled."}
              </p>

              <div className="pt-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  <Link href="/dashboard/friends">Manage & Settle Balances</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Recent Transactions</h2>
          {transactions.length > 5 && (
            <Button asChild variant="link" size="sm" className="text-xs">
              <Link href="/dashboard/trends">
                See all in Trends <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2.5">
            {transactions.slice(0, 10).map((t) => {
              const isIncome = t.type === "income";
              const transDate = t.date instanceof Date ? t.date : new Date(t.date as any);
              const formattedDate = format(transDate, "dd MMM yyyy");

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3.5 shadow-sm transition-all hover:border-primary/40 hover:shadow"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        isIncome
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowDownRight className="h-5 w-5" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {t.description}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {t.category}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formattedDate}
                        </span>
                        {t.splits && t.splits.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-500 font-medium flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Split with {t.splits.length} friend{t.splits.length > 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-3">
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold ${
                          isIncome ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(t.amount, currency)}
                      </div>
                      {!isIncome && t.userShare !== t.amount && (
                        <div className="text-[10px] text-muted-foreground">
                          Your share: {formatCurrency(t.userShare, currency)}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(t)}
                      className="text-muted-foreground/50 hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                      title="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4" />
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
