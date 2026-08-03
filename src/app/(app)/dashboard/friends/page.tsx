"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends, useFriendLedger, useSettleUp } from "@/hooks/useFriends";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  Users,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  HandCoins,
  History,
  Calendar,
  Check,
  Receipt,
  Loader2,
  ChevronRight,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { Friend } from "@/types";
import { toast } from "sonner";

export default function FriendsDebtPage() {
  const { userProfile } = useAuth();
  const { data: friends = [], isLoading } = useFriends();
  const settleUpMutation = useSettleUp();

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleNote, setSettleNote] = useState<string>("Settled up");

  const currency = userProfile?.currency || "INR";

  // Compute friend totals
  const totalOwedToYou = friends
    .filter((f) => f.balance > 0)
    .reduce((sum, f) => sum + f.balance, 0);

  const totalYouOwe = friends
    .filter((f) => f.balance < 0)
    .reduce((sum, f) => sum + Math.abs(f.balance), 0);

  const netBalance = totalOwedToYou - totalYouOwe;

  const handleOpenSettle = (friend: Friend, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFriend(friend);
    setSettleAmount(Math.abs(friend.balance).toString());
    setSettleNote("Settled up");
    setSettleModalOpen(true);
  };

  const handleConfirmSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend) return;

    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid positive settlement amount");
      return;
    }

    try {
      await settleUpMutation.mutateAsync({
        friendId: selectedFriend.id,
        amount: amt,
        note: settleNote.trim(),
      });

      toast.success(`Settlement of ${formatCurrency(amt, currency)} recorded for ${selectedFriend.name}!`);
      setSettleModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to record settlement");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto text-ink-text">
      {/* Header */}
      <div className="border-b border-fiber-line pb-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
          Friends & Debt Register
        </h1>
        <p className="text-xs font-sans text-muted-text pt-0.5">
          Track who owes you and who you owe from split expenses and shared entries.
        </p>
      </div>

      {/* 3 Top Summary Metric Cards */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:pb-0 sm:grid sm:grid-cols-3">
        <div className="snap-start min-w-[220px] sm:min-w-0">
          <StatsCard
            title="Friends Owe You"
            value={`+${formatCurrency(totalOwedToYou, currency)}`}
            subtitle={`${friends.filter((f) => f.balance > 0).length} pending credit`}
            icon={ArrowUpRight}
            type="income"
          />
        </div>
        <div className="snap-start min-w-[220px] sm:min-w-0">
          <StatsCard
            title="You Owe Friends"
            value={`−${formatCurrency(totalYouOwe, currency)}`}
            subtitle={`${friends.filter((f) => f.balance < 0).length} pending debit`}
            icon={ArrowDownRight}
            type="expense"
          />
        </div>
        <div className="snap-start min-w-[220px] sm:min-w-0">
          <StatsCard
            title="Net Debt Position"
            value={`${netBalance >= 0 ? "+" : "−"}${formatCurrency(Math.abs(netBalance), currency)}`}
            subtitle={netBalance >= 0 ? "Overall credit" : "Overall debit"}
            icon={HandCoins}
            type={netBalance >= 0 ? "gold" : "expense"}
          />
        </div>
      </div>

      {/* Friends Ledger List */}
      <div className="rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-fiber-line pb-3">
          <div>
            <h2 className="font-display text-base font-bold text-ink-text flex items-center gap-2">
              <Users className="h-4 w-4 text-stamp-indigo" />
              <span>Friend Ledgers</span>
            </h2>
            <p className="text-xs font-sans text-muted-text">
              Select a friend to review itemized history or balance their account.
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase text-muted-text border border-fiber-line px-2 py-0.5 rounded-[3px]">
            {friends.length} friend{friends.length === 1 ? "" : "s"}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-paper-bg border border-fiber-line rounded-[6px] animate-pulse" />
            ))}
          </div>
        ) : friends.length === 0 ? (
          <EmptyState
            title="No friend debts recorded"
            description="Whenever you split an expense in Chat (e.g. 'Dinner 600, Rohit owes 300'), Rohit will appear here automatically."
          />
        ) : (
          <div className="divide-y divide-fiber-line">
            {friends.map((friend) => {
              const owesYou = friend.balance > 0;
              const youOwe = friend.balance < 0;
              const isSettled = friend.balance === 0;

              return (
                <div
                  key={friend.id}
                  onClick={() => setSelectedFriend(friend)}
                  className="relative group cursor-pointer flex items-center justify-between py-3 px-3 transition-colors hover:bg-paper-bg/60"
                >
                  {/* Margin Rule */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[2.5px]"
                    style={{
                      backgroundColor: owesYou
                        ? "var(--passbook-gold)"
                        : youOwe
                        ? "var(--rule-red)"
                        : "var(--fiber-line)",
                    }}
                  />

                  <div className="flex items-center gap-3 pl-1">
                    <div className="h-8 w-8 rounded-[4px] border border-fiber-line bg-paper-bg flex items-center justify-center font-mono text-xs font-bold text-stamp-indigo">
                      {friend.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-ink-text">
                        {friend.name}
                      </div>
                      <div className="text-[10px] font-mono text-muted-text">
                        {isSettled ? (
                          <span>All settled</span>
                        ) : owesYou ? (
                          <span className="text-passbook-gold font-bold">
                            Owes you +{formatCurrency(friend.balance, currency)}
                          </span>
                        ) : (
                          <span className="text-rule-red font-bold">
                            You owe −{formatCurrency(Math.abs(friend.balance), currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isSettled && (
                      <button
                        className="h-7 px-2.5 rounded-[4px] border border-fiber-line bg-paper-bg hover:border-stamp-indigo text-[11px] font-mono uppercase font-bold text-stamp-indigo flex items-center gap-1"
                        onClick={(e) => handleOpenSettle(friend, e)}
                      >
                        <UserCheck className="h-3 w-3" />
                        <span>Settle</span>
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-text group-hover:text-ink-text transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Friend Detail & Ledger Modal */}
      {selectedFriend && !settleModalOpen && (
        <FriendLedgerModal
          friend={selectedFriend}
          currency={currency}
          onClose={() => setSelectedFriend(null)}
          onSettle={() => handleOpenSettle(selectedFriend)}
        />
      )}

      {/* Settle Up Modal */}
      {settleModalOpen && selectedFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div className="flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-stamp-indigo" />
                <h3 className="font-display text-base font-bold text-ink-text">
                  Settle Balance with {selectedFriend.name}
                </h3>
              </div>
              <button
                onClick={() => setSettleModalOpen(false)}
                className="text-muted-text hover:text-ink-text p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs font-mono text-muted-text">
              Current balance:{" "}
              <b className="text-ink-text font-bold">
                {selectedFriend.balance >= 0 ? "+" : "−"}
                {formatCurrency(Math.abs(selectedFriend.balance), currency)}
              </b>
            </p>

            <form onSubmit={handleConfirmSettle} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-mono uppercase text-muted-text tracking-wider">
                  Settlement Amount ({currency})
                </label>
                <input
                  type="number"
                  step="any"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full h-8 rounded-[4px] border border-fiber-line bg-paper-bg px-2.5 text-xs font-mono text-ink-text focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono uppercase text-muted-text tracking-wider">
                  Memo Note
                </label>
                <input
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Paid via UPI, Cash given"
                  className="w-full h-8 rounded-[4px] border border-fiber-line bg-paper-bg px-2.5 text-xs text-ink-text focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={settleUpMutation.isPending}
                  className="flex-1 h-9 rounded-[4px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {settleUpMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Stamp Settlement</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettleModalOpen(false)}
                  className="h-9 px-4 rounded-[4px] border border-fiber-line bg-paper-bg text-xs font-mono uppercase tracking-wider text-muted-text hover:text-ink-text"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sub-component: Friend Ledger History Modal
 */
function FriendLedgerModal({
  friend,
  currency,
  onClose,
  onSettle,
}: {
  friend: Friend;
  currency: string;
  onClose: () => void;
  onSettle: () => void;
  }) {
  const { data: ledger = [], isLoading } = useFriendLedger(friend.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[8px] border border-fiber-line bg-card-bg p-5 shadow-xl space-y-3 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-fiber-line pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[4px] border border-fiber-line bg-paper-bg flex items-center justify-center font-mono text-xs font-bold text-stamp-indigo">
              {friend.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink-text">{friend.name}</h3>
              <p className="text-[10px] font-mono text-muted-text">
                Itemized split entries & settlements
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-text hover:text-ink-text p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current status bar */}
        <div className="flex items-center justify-between rounded-[4px] border border-fiber-line bg-paper-bg p-3 text-xs">
          <div>
            <span className="text-muted-text font-mono">Current Balance: </span>
            <span
              className={`font-mono font-bold text-sm ${
                friend.balance > 0
                  ? "text-passbook-gold"
                  : friend.balance < 0
                  ? "text-rule-red"
                  : "text-ink-text"
              }`}
            >
              {friend.balance > 0 ? "+" : friend.balance < 0 ? "−" : ""}
              {formatCurrency(Math.abs(friend.balance), currency)}
            </span>
          </div>

          {friend.balance !== 0 && (
            <button
              onClick={onSettle}
              className="h-7 px-3 rounded-[3px] bg-stamp-indigo text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6]"
            >
              Settle
            </button>
          )}
        </div>

        {/* Ledger Entries List */}
        <div className="flex-1 overflow-y-auto divide-y divide-fiber-line pr-1 mt-2">
          {isLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-paper-bg border border-fiber-line rounded-[4px] animate-pulse" />
              ))}
            </div>
          ) : ledger.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-text font-mono">
              <History className="h-7 w-7 mx-auto mb-2 text-muted-text/50" />
              <p>No historical entries found for {friend.name}.</p>
            </div>
          ) : (
            ledger.map((entry) => {
              const isSettle = entry.type === "settle";
              const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date as any);
              const formattedDate = format(entryDate, "dd MMM yyyy, h:mm a");

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2.5 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-ink-text">
                      {isSettle ? (
                        <span className="font-mono text-passbook-gold text-[10px] uppercase border border-fiber-line px-1 rounded-[2px]">
                          Settlement
                        </span>
                      ) : (
                        <span className="font-mono text-stamp-indigo text-[10px] uppercase border border-fiber-line px-1 rounded-[2px]">
                          Split
                        </span>
                      )}
                      <span>— {entry.note || "Transaction"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-muted-text pt-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono font-bold">
                    <span className={isSettle ? "text-passbook-gold" : "text-rule-red"}>
                      {isSettle ? "−" : "+"}
                      {formatCurrency(entry.amount, currency)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
