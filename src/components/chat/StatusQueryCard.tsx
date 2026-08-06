"use client";

import React from "react";
import { StatusQueryResult } from "@/types";
import { formatCurrency } from "@/lib/currency";
import {
  Wallet,
  Clock,
  Users,
  Check,
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
    <div className="w-full space-y-3 pt-1 text-ink-text">
      {/* 1. Balance Query View */}
      {(queryType === "balance" || (queryType === "general_summary" && balance !== undefined)) && (
        <div className="relative rounded-lg border border-fiber-line bg-paper-bg p-3.5 pl-4">
          {/* Margin Rule */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[2.5px]"
            style={{
              backgroundColor: (balance || 0) >= 0 ? "var(--thrive-green)" : "var(--stamp-red)",
            }}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-text">
              <Wallet className="h-3.5 w-3.5 text-stamp-red" />
              <span>Current Net Balance</span>
            </div>
            <span
              className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.2 border border-fiber-line rounded-[2px] ${
                (balance || 0) >= 0 ? "text-thrive-green" : "text-stamp-red"
              }`}
            >
              {(balance || 0) >= 0 ? "+ Positive" : "− Deficit"}
            </span>
          </div>

          <div className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
            {formatCurrency(balance || 0, currency)}
          </div>

          {(totalIncome !== undefined || totalExpense !== undefined) && (
            <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-fiber-line pt-2 text-xs font-mono">
              <div>
                <span className="text-muted-text">Income: </span>
                <b className="text-thrive-green">+{formatCurrency(totalIncome || 0, currency)}</b>
              </div>
              <div className="text-right">
                <span className="text-muted-text">Expense: </span>
                <b className="text-stamp-red">−{formatCurrency(totalExpense || 0, currency)}</b>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Recent Transactions List View */}
      {transactions && transactions.length > 0 && (
        <div className="rounded-lg border border-fiber-line bg-paper-bg p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-text mb-2 border-b border-fiber-line pb-1.5">
            <Clock className="h-3.5 w-3.5 text-stamp-red" />
            <span>Recent Ruled Entries</span>
          </div>

          <div className="divide-y divide-fiber-line">
            {transactions.map((tx, idx) => {
              const isIncome = tx.type === "income";
              const formattedDate = tx.date ? format(new Date(tx.date), "MMM d") : "";
              return (
                <div
                  key={tx.id || idx}
                  className="flex items-center justify-between py-1.5 text-xs font-sans"
                >
                  <div className="truncate flex-1 min-w-0 pr-2">
                    <span className="font-semibold text-ink-text truncate">
                      {tx.description || "Entry"}
                    </span>
                    <div className="text-[10px] font-mono text-muted-text">
                      {formattedDate} • {tx.category}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono font-bold">
                    <span className={isIncome ? "text-thrive-green" : "text-ink-text"}>
                      {isIncome ? "+" : "−"}
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
        <div className="rounded-lg border border-fiber-line bg-paper-bg p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-text mb-2 border-b border-fiber-line pb-1.5">
            <Users className="h-3.5 w-3.5 text-stamp-red" />
            <span>Friend Balances</span>
          </div>

          <div className="divide-y divide-fiber-line">
            {friendDebts.map((friend) => {
              const friendOwesYou = friend.balance > 0;
              return (
                <div
                  key={friend.friendId}
                  className="flex items-center justify-between py-1.5 text-xs"
                >
                  <span className="font-semibold text-ink-text truncate max-w-[150px]">
                    {friend.friendName}
                  </span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      friendOwesYou ? "text-thrive-green" : "text-stamp-red"
                    }`}
                  >
                    {friendOwesYou
                      ? `+${formatCurrency(friend.balance, currency)}`
                      : `−${formatCurrency(Math.abs(friend.balance), currency)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Zero Debts Empty State */}
      {queryType === "friend_debts" && (!friendDebts || friendDebts.length === 0) && (
        <div className="flex items-center gap-2 rounded-lg border border-fiber-line bg-paper-bg p-2.5 text-xs text-muted-text font-mono">
          <Check className="h-4 w-4 text-thrive-green shrink-0" />
          <span>All friend accounts are currently balanced and settled.</span>
        </div>
      )}
    </div>
  );
}
