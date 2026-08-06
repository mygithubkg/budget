"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGroupDetails,
  useAddGroupTransaction,
  useAddGroupSettlement,
  useAddGhostMember,
} from "@/hooks/useGroups";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  Compass,
  Users,
  ArrowLeft,
  Plus,
  Share2,
  Sparkles,
  Check,
  Send,
  Loader2,
  X,
  HandCoins,
  ArrowRight,
  Receipt,
  UserPlus,
  Copy,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { toast } from "sonner";
import { GroupMemberInfo } from "@/types/group";

export const dynamic = "force-dynamic";

export default function GroupDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const { user, userProfile, getIdToken } = useAuth();
  const { data, isLoading, refetch } = useGroupDetails(groupId);

  const addTransactionMutation = useAddGroupTransaction(groupId);
  const addSettlementMutation = useAddGroupSettlement(groupId);
  const addGhostMutation = useAddGhostMember(groupId);

  const currency = userProfile?.currency || "INR";

  // Sub-tab selection
  const [activeTab, setActiveTab] = useState<"ledger" | "ai" | "balances">("ledger");

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [addGhostModalOpen, setAddGhostModalOpen] = useState(false);
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [settleModalOpen, setSettleModalOpen] = useState(false);

  // Add Ghost Form
  const [ghostName, setGhostName] = useState("");

  // Add Expense Form
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("General");
  const [expensePaidBy, setExpensePaidBy] = useState("");

  // Settlement Form
  const [settleFrom, setSettleFrom] = useState("");
  const [settleTo, setSettleTo] = useState("");
  const [settleAmount, setSettleAmount] = useState("");

  // AI Group Logger
  const [aiMessage, setAiMessage] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [pendingAiTransaction, setPendingAiTransaction] = useState<any | null>(null);

  const group = data?.group;
  const members = data?.members || [];
  const transactions = data?.transactions || [];
  const settlements = data?.settlements || [];
  const balances = data?.balances || [];
  const simplifiedDebts = data?.simplifiedDebts || [];

  const currentUserMember = members.find((m) => m.id === user?.uid);
  const currentUserBalance = balances.find((b) => b.memberRef === user?.uid)?.netBalance || 0;

  const totalGroupSpend = transactions.reduce((acc, t) => acc + (t.totalAmount || 0), 0);

  const handleCopyInviteLink = () => {
    if (!group?.inviteCode) return;
    const inviteUrl = `${window.location.origin}/groups/join/${group.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Invite link copied to clipboard!");
  };

  const handleAddGhost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghostName.trim()) return;
    try {
      await addGhostMutation.mutateAsync({ name: ghostName.trim() });
      toast.success(`Added ${ghostName} to group!`);
      setGhostName("");
      setAddGhostModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to add member");
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (!expenseDesc.trim() || isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid description and positive amount");
      return;
    }

    const payer = expensePaidBy || user?.uid || members[0]?.id;

    try {
      await addTransactionMutation.mutateAsync({
        description: expenseDesc.trim(),
        category: expenseCategory.trim() || "General",
        totalAmount: amt,
        paidBy: payer,
        date: new Date().toISOString(),
        source: "manual",
      });

      toast.success("Group expense recorded!");
      setExpenseDesc("");
      setExpenseAmount("");
      setAddExpenseModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to add expense");
    }
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(settleAmount);
    if (!settleFrom || !settleTo || isNaN(amt) || amt <= 0) {
      toast.error("Please select sender, receiver, and positive amount");
      return;
    }

    try {
      await addSettlementMutation.mutateAsync({
        fromMemberRef: settleFrom,
        toMemberRef: settleTo,
        amount: amt,
      });

      toast.success("Settlement recorded!");
      setSettleModalOpen(false);
      setSettleAmount("");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to record settlement");
    }
  };

  const handleQuickSettleClick = (payment: any) => {
    setSettleFrom(payment.fromMemberRef);
    setSettleTo(payment.toMemberRef);
    setSettleAmount(payment.amount.toString());
    setSettleModalOpen(true);
  };

  const handleAiGroupSend = async (customText?: string) => {
    const textToSend = customText || aiMessage;
    if (!textToSend.trim() || isAiLoading) return;

    try {
      setIsAiLoading(true);
      const token = await getIdToken();
      const res = await fetch(`/api/groups/${groupId}/ai-log`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: textToSend }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to parse group expense");

      setPendingAiTransaction(json.parsed);
      setAiMessage("");
    } catch (err: any) {
      toast.error(err.message || "Could not parse group expense");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleConfirmAiTransaction = async () => {
    if (!pendingAiTransaction) return;

    try {
      await addTransactionMutation.mutateAsync({
        description: pendingAiTransaction.description,
        category: pendingAiTransaction.category,
        totalAmount: pendingAiTransaction.totalAmount,
        paidBy: pendingAiTransaction.paidBy,
        splits: pendingAiTransaction.splits,
        date: pendingAiTransaction.date,
        source: "chat",
      });

      toast.success("Group expense recorded!");
      setPendingAiTransaction(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to record group expense");
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-muted-text animate-pulse">
        Loading group ledger...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <p className="text-xs font-mono text-rule-red">Group not found or access denied.</p>
        <Link
          href="/dashboard/friends?tab=groups"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-stamp-indigo hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Group Ledgers</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto text-ink-text">
      {/* Header & Breadcrumb */}
      <div className="border-b border-fiber-line pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard/friends?tab=groups"
            className="inline-flex items-center gap-1 text-xs font-mono text-muted-text hover:text-ink-text transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Groups</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddGhostModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-fiber-line bg-paper-bg hover:border-stamp-indigo px-2.5 py-1 text-xs font-mono text-ink-text shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Member</span>
            </button>

            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] shadow-xs"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Invite</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-stamp-indigo/10 text-stamp-indigo border border-stamp-indigo/20">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink-text">
                {group.name}
              </h1>
              <p className="text-xs font-sans text-muted-text">
                {members.length} members • Created {format(new Date(group.createdAt as any), "MMMM yyyy")}
              </p>
            </div>
          </div>

          {/* Member Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 sm:pt-0">
            {members.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 rounded-[3px] border border-fiber-line bg-paper-bg px-2 py-0.5 text-[11px] font-mono text-ink-text"
              >
                <span>{m.name}</span>
                {m.isGhost && (
                  <span className="text-[9px] uppercase px-1 rounded-[2px] bg-fiber-line text-muted-text">
                    offline
                  </span>
                )}
                {m.id === user?.uid && (
                  <span className="text-[9px] uppercase px-1 rounded-[2px] bg-stamp-indigo/10 text-stamp-indigo font-bold">
                    you
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatsCard
          title="Total Group Spend"
          value={formatCurrency(totalGroupSpend, currency)}
          icon={Receipt}
          subtitle={`${transactions.length} entries recorded`}
          type="expense"
        />
        <StatsCard
          title="Your Net Position"
          value={`${currentUserBalance >= 0 ? "+" : "−"}${formatCurrency(Math.abs(currentUserBalance), currency)}`}
          icon={currentUserBalance >= 0 ? ArrowUpRight : ArrowDownRight}
          subtitle={
            currentUserBalance > 0
              ? "You are owed by group"
              : currentUserBalance < 0
              ? "You owe the group"
              : "You are settled up"
          }
          type={currentUserBalance >= 0 ? "income" : "expense"}
        />
        <StatsCard
          title="Pending Settlements"
          value={`${simplifiedDebts.length}`}
          icon={HandCoins}
          subtitle="Simplified payments needed"
          type="neutral"
        />
      </div>

      {/* Sub-Tabs: Ledger | AI Group Logger | Settle Up */}
      <div className="flex items-center justify-between border-b border-fiber-line pb-3">
        <div className="flex rounded-[6px] border border-fiber-line bg-paper-bg p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] transition-colors ${
              activeTab === "ledger"
                ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Group Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] transition-colors ${
              activeTab === "ai"
                ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Logger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("balances")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] transition-colors ${
              activeTab === "balances"
                ? "bg-stamp-indigo text-[#EDE7D6] font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <HandCoins className="h-3.5 w-3.5" />
            <span>Settle Up ({simplifiedDebts.length})</span>
          </button>
        </div>

        {activeTab === "ledger" && (
          <button
            type="button"
            onClick={() => setAddExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Expense</span>
          </button>
        )}
      </div>

      {/* TAB 1: LEDGER */}
      {activeTab === "ledger" && (
        <div className="rounded-[8px] border border-fiber-line bg-card-bg shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-fiber-line flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-ink-text">
                Itemized Group Expenses &amp; Settlements
              </h2>
              <p className="text-xs text-muted-text">
                Chronological ledger for {group.name}
              </p>
            </div>
          </div>

          {transactions.length === 0 && settlements.length === 0 ? (
            <EmptyState
              title="No Group Expenses Yet"
              description="Record your first shared expense manually or use the AI Logger tab to dictate entries."
              actionText="Add First Expense"
              onActionClick={() => setAddExpenseModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-fiber-line text-muted-text text-[10px] uppercase bg-paper-bg/50">
                    <th className="py-2.5 px-4 font-normal">Date</th>
                    <th className="py-2.5 px-4 font-normal">Description</th>
                    <th className="py-2.5 px-4 font-normal">Paid By</th>
                    <th className="py-2.5 px-4 font-normal">Category</th>
                    <th className="py-2.5 px-4 font-normal text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fiber-line/60">
                  {transactions.map((tx) => {
                    const payer = members.find((m) => m.id === tx.paidBy)?.name || "Unknown";
                    const txDate =
                      typeof tx.date === "string"
                        ? new Date(tx.date)
                        : (tx.date as any)?.toDate?.() || new Date();

                    return (
                      <tr key={tx.id} className="hover:bg-paper-bg/40 transition-colors">
                        <td className="py-3 px-4 text-muted-text whitespace-nowrap">
                          {format(txDate, "yyyy-MM-dd")}
                        </td>
                        <td className="py-3 px-4 font-bold text-ink-text">
                          {tx.description}
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {tx.splits.map((s, sIdx) => {
                              const sName = members.find((m) => m.id === s.memberRef)?.name || "Member";
                              return (
                                <span
                                  key={sIdx}
                                  className="text-[9px] font-normal px-1 py-0.2 border border-fiber-line rounded-[2px] text-muted-text"
                                >
                                  {sName}: {formatCurrency(s.amount, currency)}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-ink-text">
                          <span className="font-semibold text-stamp-indigo">{payer}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] px-2 py-0.5 rounded-[3px] border border-fiber-line bg-paper-bg text-muted-text">
                            {tx.category || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-ink-text whitespace-nowrap">
                          {formatCurrency(tx.totalAmount, currency)}
                        </td>
                      </tr>
                    );
                  })}

                  {settlements.map((st) => {
                    const fromName = members.find((m) => m.id === st.fromMemberRef)?.name || "Sender";
                    const toName = members.find((m) => m.id === st.toMemberRef)?.name || "Receiver";
                    const stDate =
                      typeof st.date === "string"
                        ? new Date(st.date)
                        : (st.date as any)?.toDate?.() || new Date();

                    return (
                      <tr key={st.id} className="bg-stamp-indigo/5 hover:bg-stamp-indigo/10 transition-colors">
                        <td className="py-3 px-4 text-muted-text whitespace-nowrap">
                          {format(stDate, "yyyy-MM-dd")}
                        </td>
                        <td className="py-3 px-4 font-bold text-stamp-indigo" colSpan={2}>
                          Settlement: {fromName} paid {toName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] px-2 py-0.5 rounded-[3px] border border-stamp-indigo/30 bg-stamp-indigo/10 text-stamp-indigo uppercase">
                            Settlement
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-stamp-emerald whitespace-nowrap">
                          ✓ {formatCurrency(st.amount, currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI GROUP LOGGER */}
      {activeTab === "ai" && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-fiber-line pb-3">
              <Sparkles className="h-5 w-5 text-stamp-indigo" />
              <div>
                <h3 className="font-display text-base font-bold text-ink-text">
                  AI Group Trip Logger
                </h3>
                <p className="text-xs text-muted-text">
                  Type any group expense naturally. The AI recognizes who paid and creates equal or custom splits automatically.
                </p>
              </div>
            </div>

            {/* Suggested Prompts */}
            <div className="flex flex-wrap gap-1.5">
              {[
                "I paid 3500 for hotel stay",
                "Sam paid 600 for taxi, split equally",
                "Dinner was 2400 paid by me",
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAiGroupSend(chip)}
                  className="rounded-[4px] border border-fiber-line bg-paper-bg hover:border-stamp-indigo text-[11px] font-sans text-ink-text px-2.5 py-1 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiGroupSend()}
                placeholder="e.g. Maya paid 1200 for groceries..."
                disabled={isAiLoading}
                className="flex-1 rounded-[6px] border border-fiber-line bg-paper-bg px-3 py-2 text-xs font-sans text-ink-text focus:border-stamp-indigo focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAiGroupSend()}
                disabled={!aiMessage.trim() || isAiLoading}
                className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-[#EDE7D6] disabled:opacity-40"
              >
                {isAiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Pending Confirmation Card */}
            {pendingAiTransaction && (
              <div className="rounded-[6px] border border-stamp-indigo/40 bg-stamp-indigo/5 p-4 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-stamp-indigo/20 pb-2">
                  <span className="text-xs font-mono font-bold uppercase text-stamp-indigo">
                    Confirm Group Entry
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingAiTransaction(null)}
                    className="text-muted-text hover:text-ink-text"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-muted-text text-[10px] uppercase">Description:</span>
                    <p className="font-bold text-ink-text">{pendingAiTransaction.description}</p>
                  </div>
                  <div>
                    <span className="text-muted-text text-[10px] uppercase">Total Amount:</span>
                    <p className="font-bold text-stamp-emerald">
                      {formatCurrency(pendingAiTransaction.totalAmount, currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-text text-[10px] uppercase">Paid By:</span>
                    <p className="font-bold text-ink-text">
                      {members.find((m) => m.id === pendingAiTransaction.paidBy)?.name || "Member"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-text text-[10px] uppercase">Category:</span>
                    <p className="font-bold text-ink-text">{pendingAiTransaction.category}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-stamp-indigo/20">
                  <span className="text-muted-text text-[10px] uppercase font-mono block mb-1">
                    Splits ({pendingAiTransaction.splits?.length || 0} members):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(pendingAiTransaction.splits || []).map((s: any, idx: number) => {
                      const mName = members.find((m) => m.id === s.memberRef)?.name || "Member";
                      return (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-paper-bg border border-fiber-line"
                        >
                          {mName}: {formatCurrency(s.amount, currency)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPendingAiTransaction(null)}
                    className="px-3 py-1 text-xs font-mono rounded-[4px] border border-fiber-line text-muted-text hover:text-ink-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAiTransaction}
                    className="px-4 py-1 text-xs font-mono font-bold uppercase rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-[#EDE7D6]"
                  >
                    Confirm &amp; Record
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SETTLE UP & BALANCES */}
      {activeTab === "balances" && (
        <div className="space-y-6">
          {/* Member Balance Summary Table */}
          <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-ink-text">
                  Member Balances
                </h2>
                <p className="text-xs text-muted-text">
                  Total paid vs total share per person
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-fiber-line text-muted-text text-[10px] uppercase bg-paper-bg/50">
                    <th className="py-2.5 px-4 font-normal">Member</th>
                    <th className="py-2.5 px-4 font-normal text-right">Total Paid</th>
                    <th className="py-2.5 px-4 font-normal text-right">Total Share</th>
                    <th className="py-2.5 px-4 font-normal text-right">Net Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fiber-line/60">
                  {balances.map((b) => (
                    <tr key={b.memberRef} className="hover:bg-paper-bg/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-ink-text flex items-center gap-1.5">
                        <span>{b.name}</span>
                        {b.isGhost && (
                          <span className="text-[9px] font-normal uppercase px-1 rounded-[2px] bg-fiber-line text-muted-text">
                            offline
                          </span>
                        )}
                        {b.memberRef === user?.uid && (
                          <span className="text-[9px] font-normal uppercase px-1 rounded-[2px] bg-stamp-indigo/10 text-stamp-indigo font-bold">
                            you
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-text">
                        {formatCurrency(b.totalPaid, currency)}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-text">
                        {formatCurrency(b.totalShare, currency)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                          b.netBalance > 0
                            ? "text-stamp-emerald"
                            : b.netBalance < 0
                            ? "text-rule-red"
                            : "text-muted-text"
                        }`}
                      >
                        {b.netBalance > 0 ? "+" : b.netBalance < 0 ? "−" : ""}
                        {formatCurrency(Math.abs(b.netBalance), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Simplified Debt Settlements Card */}
          <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-fiber-line pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-ink-text flex items-center gap-2">
                  <HandCoins className="h-4 w-4 text-stamp-indigo" />
                  <span>Minimum Settlement Plan (Debt Simplification)</span>
                </h2>
                <p className="text-xs text-muted-text">
                  Algorithmic greedy cash flow settlement to resolve all group debts with fewest transactions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSettleModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] shadow-xs shrink-0"
              >
                <span>Record Payment</span>
              </button>
            </div>

            {simplifiedDebts.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-stamp-emerald space-y-1">
                <Check className="h-6 w-6 mx-auto mb-1 text-stamp-emerald" />
                <p className="font-bold">All group debts are completely settled!</p>
                <p className="text-muted-text text-[11px]">No pending payments between members.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {simplifiedDebts.map((payment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 rounded-[6px] border border-fiber-line bg-paper-bg/60"
                  >
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-bold text-rule-red">{payment.fromName}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-text" />
                      <span className="font-bold text-stamp-emerald">{payment.toName}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs text-ink-text">
                        {formatCurrency(payment.amount, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuickSettleClick(payment)}
                        className="px-2.5 py-1 rounded-[3px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-[#EDE7D6] font-mono text-[10px] font-bold uppercase shadow-2xs"
                      >
                        Settle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Link Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[8px] border border-fiber-line bg-card-bg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-stamp-indigo" />
                <h3 className="font-display text-base font-bold text-ink-text">
                  Invite to {group.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="text-muted-text hover:text-ink-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-text block mb-1">
                  6-Character Invite Code
                </span>
                <div className="p-3 bg-paper-bg border border-fiber-line rounded-[4px] text-center">
                  <span className="font-mono text-2xl font-bold tracking-widest text-stamp-indigo uppercase">
                    {group.inviteCode || "TRIP01"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-text block mb-1">
                  Shareable Link
                </span>
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="w-full flex items-center justify-between p-2.5 rounded-[4px] border border-fiber-line bg-paper-bg hover:border-stamp-indigo text-xs font-mono text-ink-text transition-colors"
                >
                  <span className="truncate mr-2">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/groups/join/${group.inviteCode}`
                      : ""}
                  </span>
                  <Copy className="h-4 w-4 shrink-0 text-stamp-indigo" />
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-fiber-line">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-4 py-1.5 rounded-[4px] bg-stamp-indigo text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Offline Ghost Member Modal */}
      {addGhostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[8px] border border-fiber-line bg-card-bg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-stamp-indigo" />
                <h3 className="font-display text-base font-bold text-ink-text">
                  Add Member
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddGhostModalOpen(false)}
                className="text-muted-text hover:text-ink-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddGhost} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-muted-text">
                  Member Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Charlie"
                  value={ghostName}
                  onChange={(e) => setGhostName(e.target.value)}
                  className="w-full rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-xs font-sans text-ink-text focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-fiber-line">
                <button
                  type="button"
                  onClick={() => setAddGhostModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-[4px] border border-fiber-line text-xs font-mono text-muted-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addGhostMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6]"
                >
                  {addGhostMutation.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Add to Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {addExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[8px] border border-fiber-line bg-card-bg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-stamp-indigo" />
                <h3 className="font-display text-base font-bold text-ink-text">
                  Record Group Expense
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddExpenseModalOpen(false)}
                className="text-muted-text hover:text-ink-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-text">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scuba diving, Grocery run"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  className="w-full rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-text">
                    Total Amount ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-text">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="Food, Travel, etc."
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-text">
                  Paid By
                </label>
                <select
                  value={expensePaidBy || user?.uid || members[0]?.id}
                  onChange={(e) => setExpensePaidBy(e.target.value)}
                  className="w-full rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === user?.uid ? "(You)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] text-muted-text pt-1">
                Note: Expense will be split equally among all {members.length} members.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-fiber-line">
                <button
                  type="button"
                  onClick={() => setAddExpenseModalOpen(false)}
                  className="px-3 py-1.5 rounded-[4px] border border-fiber-line text-muted-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addTransactionMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 font-bold uppercase tracking-wider text-[#EDE7D6]"
                >
                  {addTransactionMutation.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Settlement Modal */}
      {settleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[8px] border border-fiber-line bg-card-bg p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div className="flex items-center gap-2">
                <HandCoins className="h-5 w-5 text-stamp-indigo" />
                <h3 className="font-display text-base font-bold text-ink-text">
                  Record Settlement Payment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="text-muted-text hover:text-ink-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRecordSettlement} className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-text">
                    Who Paid (Sender)
                  </label>
                  <select
                    value={settleFrom || members[0]?.id}
                    onChange={(e) => setSettleFrom(e.target.value)}
                    className="w-full rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-text">
                    To Whom (Receiver)
                  </label>
                  <select
                    value={settleTo || members[1]?.id || members[0]?.id}
                    onChange={(e) => setSettleTo(e.target.value)}
                    className="w-full rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-text">
                  Settlement Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full rounded-[4px] border border-fiber-line bg-paper-bg px-3 py-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-fiber-line">
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="px-3 py-1.5 rounded-[4px] border border-fiber-line text-muted-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSettlementMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 font-bold uppercase tracking-wider text-[#EDE7D6]"
                >
                  {addSettlementMutation.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>Record Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
