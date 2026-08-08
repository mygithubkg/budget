"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends, useFriendLedger, useSettleUp } from "@/hooks/useFriends";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { GroupsListView } from "@/components/groups/GroupsListView";
import { MobileFriendsView } from "@/components/mobile/MobileFriendsView";
import { ShareStatementModal } from "@/components/friends/ShareStatementModal";
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
  Compass,
  Share2,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import { Friend } from "@/types";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

export default function FriendsDebtPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "direct";

  const { userProfile, user } = useAuth();
  const { data: friends = [], isLoading } = useFriends();
  const settleUpMutation = useSettleUp();

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleNote, setSettleNote] = useState<string>("Settled up");
  const [shareModalFriend, setShareModalFriend] = useState<Friend | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

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

  const handleTabChange = (tabKey: string) => {
    router.replace(`/dashboard/friends?tab=${tabKey}`, { scroll: false });
  };

  return (
    <>
      {/* ── Mobile UI v4 (<640px) ── */}
      <div className="block sm:hidden px-3.5 py-4">
        <MobileFriendsView
          friends={friends}
          currency={currency}
          onSelectFriend={(f) => {
            setSelectedFriend(f);
            setSettleAmount(f.balance < 0 ? String(Math.abs(f.balance)) : "");
          }}
          onOpenSettle={handleOpenSettle}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* ── Desktop Ledger v2 (>=640px) ── */}
      <div className="hidden sm:block flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto text-ink-text">
        {/* Top Segmented Sub-Tab Bar */}
        <div className="flex items-center justify-between border-b border-fiber-line pb-3">
        <div className="flex rounded-lg border border-fiber-line bg-paper-bg p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => handleTabChange("direct")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === "direct"
                ? "bg-stamp-red text-[#FFFFFF] font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>1:1 Friends</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("groups")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-colors ${
              activeTab === "groups"
                ? "bg-stamp-red text-[#FFFFFF] font-bold shadow-xs"
                : "text-muted-text hover:text-ink-text"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Trip Groups</span>
          </button>
        </div>
      </div>

      {activeTab === "groups" ? (
        <GroupsListView />
      ) : (
        <div className="space-y-6">
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
          <div className="rounded-xl border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-fiber-line pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-ink-text flex items-center gap-2">
                  <Users className="h-4 w-4 text-stamp-red" />
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
              <div key={i} className="h-14 bg-paper-bg border border-fiber-line rounded-lg animate-pulse" />
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
                        ? "var(--thrive-green)"
                        : youOwe
                        ? "var(--stamp-red)"
                        : "var(--fiber-line)",
                    }}
                  />

                  <div className="flex items-center gap-3 pl-1">
                    <div className="h-8 w-8 rounded-lg border border-fiber-line bg-paper-bg flex items-center justify-center font-mono text-xs font-bold text-stamp-red">
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
                          <span className="text-thrive-green font-bold">
                            Owes you +{formatCurrency(friend.balance, currency)}
                          </span>
                        ) : (
                          <span className="text-stamp-red font-bold">
                            You owe −{formatCurrency(Math.abs(friend.balance), currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isSettled && (
                      <button
                        className="h-7 px-2.5 rounded-lg border border-fiber-line bg-paper-bg hover:border-stamp-red text-[11px] font-mono uppercase font-bold text-stamp-red flex items-center gap-1"
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
    </div>
  )}
</div>

    {/* ── Global Shared Modals (Available to both Mobile & Desktop) ── */}

    {/* Friend Detail & Ledger History Modal */}
    {selectedFriend && !settleModalOpen && (
      <FriendLedgerModal
        friend={selectedFriend}
        currency={currency}
        onClose={() => setSelectedFriend(null)}
        onSettle={() => handleOpenSettle(selectedFriend)}
        onShare={(friend, ledger) => {
          setShareModalFriend(friend);
          setShareModalOpen(true);
        }}
      />
    )}

    {/* Settle Up Modal */}
    {settleModalOpen && selectedFriend && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md rounded-[24px] border border-fiber-line dark:border-white/[0.08] bg-card-bg dark:bg-[#11131A] p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-fiber-line dark:border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-stamp-red/10 dark:bg-stamp-red/20 text-stamp-red flex items-center justify-center">
                <HandCoins className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display sm:font-inter text-base font-bold text-ink-text dark:text-white">
                  Settle Balance with {selectedFriend.name}
                </h3>
                <p className="text-[11px] font-mono text-muted-text">
                  Record a payment settlement entry
                </p>
              </div>
            </div>
            <button
              onClick={() => setSettleModalOpen(false)}
              className="text-muted-text hover:text-ink-text dark:hover:text-white p-1.5 rounded-full hover:bg-paper-bg-subtle dark:hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Balance Overview Card */}
          <div className="rounded-[16px] bg-paper-bg dark:bg-[#181B24] border border-fiber-line dark:border-white/[0.06] p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-text">
                Current Outstanding Balance
              </p>
              <p
                className={`text-lg font-bold font-jetbrains-mono mt-0.5 tabular-nums ${
                  selectedFriend.balance > 0
                    ? "text-thrive-green"
                    : selectedFriend.balance < 0
                    ? "text-stamp-red"
                    : "text-ink-text dark:text-white"
                }`}
              >
                {selectedFriend.balance > 0
                  ? `+${formatCurrency(selectedFriend.balance, currency)} (Owes you)`
                  : selectedFriend.balance < 0
                  ? `−${formatCurrency(Math.abs(selectedFriend.balance), currency)} (You owe)`
                  : "All settled"}
              </p>
            </div>

            {selectedFriend.balance !== 0 && (
              <button
                type="button"
                onClick={() => setSettleAmount(Math.abs(selectedFriend.balance).toString())}
                className="text-[11px] font-mono font-bold text-stamp-red hover:underline px-2 py-1 rounded-lg border border-stamp-red/20 bg-stamp-red/10"
              >
                Settle in Full
              </button>
            )}
          </div>

          <form onSubmit={handleConfirmSettle} className="space-y-3.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-mono uppercase text-muted-text tracking-wider">
                  Settlement Amount ({currency})
                </label>
                <span className="text-[10px] font-mono text-muted-text">
                  Enter partial or full amount
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  autoFocus
                  className="w-full h-10 rounded-[14px] border border-fiber-line dark:border-white/[0.1] bg-paper-bg dark:bg-black/30 px-3 text-sm font-mono font-bold text-ink-text dark:text-white focus:border-stamp-red focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-mono uppercase text-muted-text tracking-wider">
                Payment Memo Note
              </label>
              <input
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                placeholder="e.g. Paid via UPI, Google Pay, Cash"
                className="w-full h-10 rounded-[14px] border border-fiber-line dark:border-white/[0.1] bg-paper-bg dark:bg-black/30 px-3 text-xs text-ink-text dark:text-white focus:border-stamp-red focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={settleUpMutation.isPending}
                className="flex-1 h-10 rounded-full bg-stamp-red hover:bg-stamp-red/90 text-xs font-mono font-bold uppercase tracking-wider text-[#FFFFFF] flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {settleUpMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>Record Settlement</span>
              </button>
              <button
                type="button"
                onClick={() => setSettleModalOpen(false)}
                className="h-10 px-4 rounded-full border border-fiber-line dark:border-white/[0.1] bg-paper-bg dark:bg-white/[0.04] text-xs font-mono uppercase tracking-wider text-muted-text hover:text-ink-text dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Share Statement Modal */}
    {shareModalFriend && (
      <ShareStatementWrapper
        friend={shareModalFriend}
        currency={currency}
        userName={userProfile?.displayName || user?.displayName || "Account Holder"}
        open={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setShareModalFriend(null);
        }}
      />
    )}
  </>
  );
}

/**
 * Sub-component: Share Statement Wrapper that queries ledger for friend
 */
function ShareStatementWrapper({
  friend,
  currency,
  userName,
  open,
  onClose,
}: {
  friend: Friend;
  currency: string;
  userName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: ledgerEntries = [], isLoading } = useFriendLedger(friend.id);

  return (
    <ShareStatementModal
      friend={friend}
      ledgerEntries={ledgerEntries}
      isLoading={isLoading}
      currency={currency}
      userName={userName}
      open={open}
      onClose={onClose}
    />
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
  onShare,
}: {
  friend: Friend;
  currency: string;
  onClose: () => void;
  onSettle: () => void;
  onShare: (friend: Friend, ledger: any[]) => void;
}) {
  const { data: ledger = [], isLoading } = useFriendLedger(friend.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-[24px] border border-fiber-line dark:border-white/[0.08] bg-card-bg dark:bg-[#11131A] p-5 sm:p-6 shadow-2xl space-y-3.5 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-fiber-line dark:border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full border border-fiber-line dark:border-white/[0.1] bg-paper-bg dark:bg-[#181B24] flex items-center justify-center font-mono text-xs font-bold text-stamp-red">
              {friend.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-display sm:font-inter text-base font-bold text-ink-text dark:text-white">
                {friend.name}
              </h3>
              <p className="text-[11px] font-mono text-muted-text">
                Itemized split entries & settlements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-text hover:text-ink-text dark:hover:text-white p-1.5 rounded-full hover:bg-paper-bg-subtle dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current status bar with Settle and Share actions */}
        <div className="flex items-center justify-between rounded-[16px] border border-fiber-line dark:border-white/[0.06] bg-paper-bg dark:bg-[#181B24] p-3 text-xs">
          <div>
            <span className="text-muted-text font-mono text-[11px]">Current Balance: </span>
            <span
              className={`font-mono font-bold text-sm ${
                friend.balance > 0
                  ? "text-thrive-green"
                  : friend.balance < 0
                  ? "text-stamp-red"
                  : "text-ink-text dark:text-white"
              }`}
            >
              {friend.balance > 0 ? "+" : friend.balance < 0 ? "−" : ""}
              {formatCurrency(Math.abs(friend.balance), currency)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onShare(friend, ledger)}
              className="h-7 px-2.5 rounded-full border border-fiber-line dark:border-white/[0.1] bg-card-bg dark:bg-white/[0.06] hover:bg-paper-bg-subtle text-[11px] font-mono font-bold text-ink-text dark:text-slate-200 flex items-center gap-1 transition-colors"
            >
              <Share2 className="h-3 w-3" />
              <span>Share</span>
            </button>

            {friend.balance !== 0 && (
              <button
                onClick={onSettle}
                className="h-7 px-3 rounded-full bg-stamp-red hover:bg-stamp-red/90 text-xs font-mono font-bold uppercase tracking-wider text-[#FFFFFF] shadow-sm transition-all"
              >
                Settle
              </button>
            )}
          </div>
        </div>

        {/* Ledger Entries List */}
        <div className="flex-1 overflow-y-auto divide-y divide-fiber-line dark:divide-white/[0.04] pr-1 mt-2">
          {isLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-paper-bg dark:bg-white/[0.02] border border-fiber-line dark:border-white/[0.06] rounded-xl animate-pulse"
                />
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
              const isBorrow =
                entry.type === "borrow" || entry.direction === "i_owe_them";
              const entryDate =
                entry.date instanceof Date
                  ? entry.date
                  : new Date(entry.date as any);
              const formattedDate = format(entryDate, "dd MMM yyyy, h:mm a");

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2.5 px-1 text-xs hover:bg-paper-bg/40 dark:hover:bg-white/[0.02] transition-colors rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-ink-text dark:text-white">
                      {isSettle ? (
                        <span className="font-mono text-stamp-red text-[10px] uppercase border border-stamp-red/40 bg-stamp-red/10 px-1.5 py-0.5 rounded-full">
                          Settlement
                        </span>
                      ) : isBorrow ? (
                        <span className="font-mono text-stamp-red text-[10px] uppercase border border-stamp-red/40 bg-stamp-red/10 px-1.5 py-0.5 rounded-full">
                          You Owe
                        </span>
                      ) : (
                        <span className="font-mono text-thrive-green text-[10px] uppercase border border-thrive-green/40 bg-thrive-green/10 px-1.5 py-0.5 rounded-full">
                          Owes You
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
                    <span
                      className={
                        isSettle
                          ? "text-stamp-red"
                          : isBorrow
                          ? "text-stamp-red"
                          : "text-thrive-green"
                      }
                    >
                      {isSettle ? "" : isBorrow ? "−" : "+"}
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

