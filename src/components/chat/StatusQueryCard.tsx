"use client";

import React from "react";
import { StatusQueryResult } from "@/types";
import { formatCurrency } from "@/lib/currency";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { format } from "date-fns";

interface StatusQueryCardProps {
  statusData: StatusQueryResult;
  currency?: string;
}

export function StatusQueryCard({
  statusData,
  currency = "INR",
}: StatusQueryCardProps) {
  const { queryType, balance, totalIncome, totalExpense, transactions, friendDebts } =
    statusData;

  return (
    <div className="w-full space-y-3 pt-1">
      {/* 1. Balance Query View */}
      {(queryType === "balance" || (queryType === "general_summary" && balance !== undefined)) && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-card to-primary/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Wallet className="h-4 w-4 text-primary" />
              <span>Current Net Balance</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                (balance || 0) >= 0
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
              }`}
            >
              {(balance || 0) >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {(balance || 0) >= 0 ? "Positive" : "Deficit"}
            </span>
          </div>

          <div className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {formatCurrency(balance || 0, currency)}
          </div>

          {(totalIncome !== undefined || totalExpense !== undefined) && (
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-2.5 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                <span>Income: <b className="text-foreground">{formatCurrency(totalIncome || 0, currency)}</b></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                <span>Spent: <b className="text-foreground">{formatCurrency(totalExpense || 0, currency)}</b></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Recent Transactions List View */}
      {transactions && transactions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-3.5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span>Recent Transactions</span>
          </div>

          <div className="space-y-2">
            {transactions.map((tx, idx) => {
              const isIncome = tx.type === "income";
              const formattedDate = tx.date ? format(new Date(tx.date), "MMM d") : "";
              return (
                <div
                  key={tx.id || idx}
                  className="flex items-center justify-between rounded-xl bg-background/80 px-3 py-2 border border-border/50 text-xs transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        isIncome
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      {isIncome ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">
                        {tx.description || "Transaction"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formattedDate} • {tx.category}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-bold ml-2">
                    <span
                      className={
                        isIncome ? "text-emerald-500" : "text-foreground"
                      }
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(tx.userShare || tx.amount, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Friend Debts View */}
      {friendDebts && friendDebts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/60 p-3.5 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
            <Users className="h-3.5 w-3.5 text-purple-400" />
            <span>Friend Balances</span>
          </div>

          <div className="space-y-2">
            {friendDebts.map((friend) => {
              const friendOwesYou = friend.balance > 0;
              return (
                <div
                  key={friend.friendId}
                  className="flex items-center justify-between rounded-xl bg-background/80 px-3 py-2 border border-border/50 text-xs"
                >
                  <span className="font-semibold text-foreground truncate max-w-[140px]">
                    {friend.friendName}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      friendOwesYou
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                    }`}
                  >
                    {friendOwesYou
                      ? `Owes you ${formatCurrency(friend.balance, currency)}`
                      : `You owe ${formatCurrency(Math.abs(friend.balance), currency)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Zero Debts Empty State */}
      {queryType === "friend_debts" && (!friendDebts || friendDebts.length === 0) && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>All settled up! None of your friends owe you or have pending balances.</span>
        </div>
      )}
    </div>
  );
}
