"use client";

import React, { useMemo } from "react";
import { Transaction, Friend, UserProfile } from "@/types";
import { MobileBalanceHero } from "./MobileBalanceHero";
import { MobileFeatureCards } from "./MobileFeatureCards";
import { MobileRecentEntries } from "./MobileRecentEntries";
import { MobileAllocationView } from "./MobileAllocationView";
import { MarketsView } from "@/components/dashboard/MarketsView";
import { TrendsView } from "@/components/dashboard/TrendsView";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { isSameMonth } from "date-fns";

interface MobileDashboardViewProps {
  transactions: Transaction[];
  friends: Friend[];
  currency: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  userProfile: UserProfile | null;
}

export function MobileDashboardView({
  transactions,
  friends,
  currency,
  activeTab,
  onTabChange,
  onDeleteTransaction,
  userProfile,
}: MobileDashboardViewProps) {
  const now = useMemo(() => new Date(), []);

  // Balances
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

  // Savings rate
  const savingsRate =
    thisMonthIncome > 0
      ? Math.max(0, Math.round(((thisMonthIncome - thisMonthExpense) / thisMonthIncome) * 100))
      : 0;

  // Friend debt net
  const friendDebtNet = useMemo(() => {
    return friends.reduce((sum, f) => sum + (f.balance || 0), 0);
  }, [friends]);

  // Category Summaries for Feature Cards
  const categorySummaries = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    thisMonthTrans
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = t.category || "Misc";
        if (!map[cat]) map[cat] = { amount: 0, count: 0 };
        map[cat].amount += t.userShare ?? t.amount;
        map[cat].count += 1;
      });

    return Object.entries(map)
      .map(([category, val]) => ({
        category,
        amount: val.amount,
        count: val.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [thisMonthTrans]);

  return (
    <div className="space-y-4 px-3.5 py-2 pb-24 text-md-on-surface font-inter">
      {/* ── Segmented Sub-Tab Switcher (Overview | Trends | Categories | Markets) ── */}
      <div className="flex rounded-full bg-md-surface-container-high border border-fiber-line dark:border-white/[0.06] p-1 text-xs font-medium overflow-x-auto gap-0.5 no-scrollbar">
        <button
          type="button"
          onClick={() => onTabChange("overview")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full whitespace-nowrap transition-all font-inter ${
            activeTab === "overview" || !activeTab
              ? "bg-md-surface-bright text-md-on-surface font-bold shadow-sm"
              : "text-md-on-surface-variant hover:text-md-on-surface"
          }`}
        >
          <MaterialIcon name="dashboard" size={16} fill={activeTab === "overview" || !activeTab} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("trends")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full whitespace-nowrap transition-all font-inter ${
            activeTab === "trends"
              ? "bg-md-surface-bright text-md-on-surface font-bold shadow-sm"
              : "text-md-on-surface-variant hover:text-md-on-surface"
          }`}
        >
          <MaterialIcon name="trending_up" size={16} />
          <span>Trends</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("categories")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full whitespace-nowrap transition-all font-inter ${
            activeTab === "categories"
              ? "bg-md-surface-bright text-md-on-surface font-bold shadow-sm"
              : "text-md-on-surface-variant hover:text-md-on-surface"
          }`}
        >
          <MaterialIcon name="pie_chart" size={16} fill={activeTab === "categories"} />
          <span>Categories</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange("markets")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full whitespace-nowrap transition-all font-inter ${
            activeTab === "markets"
              ? "bg-md-surface-bright text-md-on-surface font-bold shadow-sm"
              : "text-md-on-surface-variant hover:text-md-on-surface"
          }`}
        >
          <MaterialIcon name="language" size={16} />
          <span>Markets</span>
        </button>
      </div>

      {/* ── Active Content Branch ── */}
      {activeTab === "categories" ? (
        <MobileAllocationView
          transactions={transactions}
          currency={currency}
          onBack={() => onTabChange("overview")}
        />
      ) : activeTab === "trends" ? (
        <div className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow">
          <TrendsView />
        </div>
      ) : activeTab === "markets" ? (
        <div className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow">
          <MarketsView />
        </div>
      ) : (
        /* ── Main Mobile Overview View ── */
        <div className="space-y-4">
          {/* Balance Hero + KPI Split */}
          <MobileBalanceHero
            balance={currentTotalBalance}
            income={thisMonthIncome}
            expense={thisMonthExpense}
            currency={currency}
            savingsRate={savingsRate}
            friendDebtNet={friendDebtNet}
            onViewLedger={() => onTabChange("categories")}
          />

          {/* Category Feature Cards */}
          <MobileFeatureCards
            categorySummaries={categorySummaries}
            currency={currency}
            onSelectCategory={() => onTabChange("categories")}
          />

          {/* Recent Entries */}
          <MobileRecentEntries
            transactions={transactions}
            currency={currency}
            onDeleteTransaction={onDeleteTransaction}
          />
        </div>
      )}
    </div>
  );
}

export default MobileDashboardView;
