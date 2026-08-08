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

      {/* ── Desktop (>=640px) ── */}
      <div className="hidden sm:block flex-1 space-y-6 p-6 lg:p-8 max-w-6xl mx-auto text-on-surface">
        {/* Top Segmented Sub-Tab Bar */}
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
          <div className="flex rounded-2xl border border-outline-variant/40 bg-surface-container-low p-1 text-xs font-jetbrains-mono gap-1">
            <button
              type="button"
              onClick={() => handleTabChange("direct")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap font-medium ${
                activeTab === "direct"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>1:1 Friends ({friends.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("groups")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap font-medium ${
                activeTab === "groups"
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60"
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>Trip Groups</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-jetbrains-mono text-on-surface-variant">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Shared Accounts Register</span>
          </div>
        </div>

        {activeTab === "groups" ? (
          <GroupsListView />
        ) : (
          <div className="space-y-6">
            {/* 3 Top Summary Metric Cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatsCard
                title="Friends Owe You"
                value={`+${formatCurrency(totalOwedToYou, currency)}`}
                subtitle={`${friends.filter((f) => f.balance > 0).length} pending credit`}
                icon={ArrowUpRight}
                type="income"
              />
              <StatsCard
                title="You Owe Friends"
                value={`−${formatCurrency(totalYouOwe, currency)}`}
                subtitle={`${friends.filter((f) => f.balance < 0).length} pending debit`}
                icon={ArrowDownRight}
                type="expense"
              />
              <StatsCard
                title="Net Debt Position"
                value={`${netBalance >= 0 ? "+" : "−"}${formatCurrency(Math.abs(netBalance), currency)}`}
                subtitle={netBalance >= 0 ? "Overall credit balance" : "Overall debit balance"}
                icon={HandCoins}
                type={netBalance >= 0 ? "income" : "expense"}
              />
            </div>

            {/* Master-Detail 2-Column Container */}
            <div className="grid grid-cols-12 gap-6 items-start">
              {/* Left Pane (5 cols): Friends List */}
              <div className="col-span-5 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-5 desktop-card-hover space-y-3">
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h2 className="font-display text-sm font-bold text-on-surface">
                      Friend Accounts
                    </h2>
                  </div>
                  <span className="font-jetbrains-mono text-[10px] uppercase text-on-surface-variant border border-outline-variant/40 px-2 py-0.5 rounded-full bg-surface-container-low">
                    {friends.length} friend{friends.length === 1 ? "" : "s"}
                  </span>
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 bg-surface-container-low border border-outline-variant/40 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : friends.length === 0 ? (
                  <EmptyState
                    title="No friend debts recorded"
                    description="Whenever you split an expense in Chat (e.g. 'Dinner 600, Rohit owes 300'), Rohit will appear here automatically."
                  />
                ) : (
                  <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                    {friends.map((friend) => {
                      const owesYou = friend.balance > 0;
                      const youOwe = friend.balance < 0;
                      const isSettled = friend.balance === 0;
                      const isSelected = selectedFriend?.id === friend.id;

                      return (
                        <div
                          key={friend.id}
                          onClick={() => setSelectedFriend(friend)}
                          className={`group cursor-pointer flex items-center justify-between p-3 rounded-2xl border transition-all ${
                            isSelected
                              ? "bg-surface-container-high border-primary/50 shadow-sm"
                              : "bg-surface-container-low/60 hover:bg-surface-container-high border-outline-variant/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl border border-outline-variant/40 bg-surface-container flex items-center justify-center font-jetbrains-mono text-xs font-bold text-primary">
                              {friend.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-on-surface">
                                {friend.name}
                              </div>
                              <div className="text-[10px] font-jetbrains-mono">
                                {isSettled ? (
                                  <span className="text-on-surface-variant">Settled up</span>
                                ) : owesYou ? (
                                  <span className="text-emerald-500 font-bold">
                                    Owes you +{formatCurrency(friend.balance, currency)}
                                  </span>
                                ) : (
                                  <span className="text-error font-bold">
                                    You owe −{formatCurrency(Math.abs(friend.balance), currency)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isSettled && (
                              <button
                                type="button"
                                className="h-7 px-2.5 rounded-xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-[11px] font-jetbrains-mono font-bold text-primary flex items-center gap-1 shadow-sm"
                                onClick={(e) => handleOpenSettle(friend, e)}
                              >
                                <UserCheck className="h-3 w-3" />
                                <span>Settle</span>
                              </button>
                            )}
                            <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? "text-primary translate-x-0.5" : "text-on-surface-variant/50"}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Pane (7 cols): Selected Friend Detail Ledger */}
              <div className="col-span-7 rounded-3xl border border-outline-variant/40 dark:border-white/[0.06] bg-surface-container p-6 desktop-card-hover min-h-[460px] flex flex-col">
                {selectedFriend ? (
                  <DesktopFriendDetailPane
                    friend={selectedFriend}
                    currency={currency}
                    onSettle={() => handleOpenSettle(selectedFriend)}
                    onShare={() => {
                      setShareModalFriend(selectedFriend);
                      setShareModalOpen(true);
                    }}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <div className="h-14 w-14 rounded-3xl border border-outline-variant/40 bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-on-surface">
                        Select a Friend Account
                      </h3>
                      <p className="text-xs font-sans text-on-surface-variant max-w-xs mx-auto pt-1">
                        Choose a friend from the left list to view their itemized transaction history, settle balances, or generate shareable statements.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    {/* ── Mobile-Only Modal (for <640px) ── */}
    {selectedFriend && !settleModalOpen && (
      <div className="sm:hidden">
        <FriendLedgerModal
          friend={selectedFriend}
          currency={currency}
          onClose={() => setSelectedFriend(null)}
          onSettle={() => handleOpenSettle(selectedFriend)}
          onShare={(friend) => {
            setShareModalFriend(friend);
            setShareModalOpen(true);
          }}
        />
      </div>
    )}

    {/* Settle Up Modal */}
    {settleModalOpen && selectedFriend && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md rounded-3xl border border-outline-variant/40 bg-surface-container p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <HandCoins className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-on-surface">
                  Settle Balance with {selectedFriend.name}
                </h3>
                <p className="text-[11px] font-jetbrains-mono text-on-surface-variant">
                  Record a payment settlement entry
                </p>
              </div>
            </div>
            <button
              onClick={() => setSettleModalOpen(false)}
              className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container-high transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Balance Overview Card */}
          <div className="rounded-2xl bg-surface-container-low border border-outline-variant/40 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-jetbrains-mono uppercase tracking-wider text-on-surface-variant">
                Current Outstanding Balance
              </p>
              <p
                className={`text-lg font-bold font-jetbrains-mono mt-0.5 tabular-nums ${
                  selectedFriend.balance > 0
                    ? "text-emerald-500"
                    : selectedFriend.balance < 0
                    ? "text-error"
                    : "text-on-surface"
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
                className="text-[11px] font-jetbrains-mono font-bold text-primary hover:underline px-2.5 py-1 rounded-xl border border-primary/30 bg-primary/10"
              >
                Settle in Full
              </button>
            )}
          </div>

          <form onSubmit={handleConfirmSettle} className="space-y-3.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-jetbrains-mono uppercase text-on-surface-variant tracking-wider">
                  Settlement Amount ({currency})
                </label>
                <span className="text-[10px] font-jetbrains-mono text-on-surface-variant">
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
                  className="w-full h-10 rounded-2xl border border-outline-variant/40 bg-surface-container-low px-3.5 text-sm font-jetbrains-mono font-bold text-on-surface focus:border-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-jetbrains-mono uppercase text-on-surface-variant tracking-wider">
                Payment Memo Note
              </label>
              <input
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                placeholder="e.g. Paid via UPI, Google Pay, Cash"
                className="w-full h-10 rounded-2xl border border-outline-variant/40 bg-surface-container-low px-3.5 text-xs text-on-surface focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={settleUpMutation.isPending}
                className="flex-1 h-10 rounded-2xl bg-primary hover:bg-primary/90 text-xs font-jetbrains-mono font-bold uppercase tracking-wider text-on-primary flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 disabled:opacity-50"
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
                className="h-10 px-4 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-xs font-jetbrains-mono uppercase tracking-wider text-on-surface-variant hover:text-on-surface transition-colors"
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
 * Sub-component: Desktop Friend Detail Pane (Embedded 2/3 Master-Detail view)
 */
function DesktopFriendDetailPane({
  friend,
  currency,
  onSettle,
  onShare,
}: {
  friend: Friend;
  currency: string;
  onSettle: () => void;
  onShare: () => void;
}) {
  const { data: ledger = [], isLoading } = useFriendLedger(friend.id);

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Header with Friend details and Action buttons */}
      <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl border border-outline-variant/40 bg-surface-container-low flex items-center justify-center font-jetbrains-mono text-sm font-bold text-primary shadow-sm">
            {friend.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-on-surface">
              {friend.name}
            </h2>
            <p className="text-[11px] font-jetbrains-mono text-on-surface-variant">
              Itemized split history & statement breakdown
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShare}
            className="h-9 px-3 rounded-2xl border border-outline-variant/40 bg-surface-container-low hover:bg-surface-container-high text-xs font-jetbrains-mono font-bold text-on-surface flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Share2 className="h-3.5 w-3.5 text-primary" />
            <span>Statement Link</span>
          </button>

          {friend.balance !== 0 && (
            <button
              type="button"
              onClick={onSettle}
              className="h-9 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-xs font-jetbrains-mono font-bold uppercase tracking-wider text-on-primary shadow-sm transition-all flex items-center gap-1.5"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Settle Up</span>
            </button>
          )}
        </div>
      </div>

      {/* Balance Summary Card */}
      <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4 flex items-center justify-between">
        <div>
          <span className="text-on-surface-variant font-jetbrains-mono text-[11px] uppercase tracking-wider">
            Current Net Balance
          </span>
          <p
            className={`font-jetbrains-mono font-bold text-xl mt-0.5 ${
              friend.balance > 0
                ? "text-emerald-500"
                : friend.balance < 0
                ? "text-error"
                : "text-on-surface"
            }`}
          >
            {friend.balance > 0 ? "+" : friend.balance < 0 ? "−" : ""}
            {formatCurrency(Math.abs(friend.balance), currency)}
            <span className="text-xs font-normal text-on-surface-variant ml-2">
              {friend.balance > 0 ? "(Owes you)" : friend.balance < 0 ? "(You owe)" : "(Settled)"}
            </span>
          </p>
        </div>

        <div className="text-right">
          <span className="text-on-surface-variant font-jetbrains-mono text-[11px]">
            {ledger.length} total entries
          </span>
        </div>
      </div>

      {/* Ledger History List */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between text-xs font-jetbrains-mono text-on-surface-variant uppercase tracking-wider px-1 pt-1 border-b border-outline-variant/40 pb-2">
          <span>Transaction</span>
          <span>Amount</span>
        </div>

        <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-outline-variant/20">
          {isLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-surface-container-low border border-outline-variant/40 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : ledger.length === 0 ? (
            <div className="py-12 text-center text-xs text-on-surface-variant font-jetbrains-mono">
              <History className="h-8 w-8 mx-auto mb-2 text-on-surface-variant/40" />
              <p>No transactions recorded yet with {friend.name}.</p>
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
                  className="flex items-center justify-between py-3 px-2 text-xs hover:bg-surface-container-low/70 transition-colors rounded-xl"
                >
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-on-surface">
                      {isSettle ? (
                        <span className="font-jetbrains-mono text-primary text-[10px] uppercase border border-primary/30 bg-primary/10 px-2 py-0.5 rounded-full">
                          Settlement
                        </span>
                      ) : isBorrow ? (
                        <span className="font-jetbrains-mono text-error text-[10px] uppercase border border-error/30 bg-error/10 px-2 py-0.5 rounded-full">
                          You Owe
                        </span>
                      ) : (
                        <span className="font-jetbrains-mono text-emerald-500 text-[10px] uppercase border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Owes You
                        </span>
                      )}
                      <span>{entry.note || "Transaction"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-jetbrains-mono text-on-surface-variant pt-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <div className="text-right font-jetbrains-mono font-bold text-sm">
                    <span
                      className={
                        isSettle
                          ? "text-primary"
                          : isBorrow
                          ? "text-error"
                          : "text-emerald-500"
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
 * Sub-component: Friend Ledger History Modal (Mobile modal view)
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
      <div className="w-full max-w-lg rounded-3xl border border-outline-variant/40 bg-surface-container p-5 sm:p-6 shadow-2xl space-y-3.5 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl border border-outline-variant/40 bg-surface-container-low flex items-center justify-center font-jetbrains-mono text-xs font-bold text-primary">
              {friend.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-on-surface">
                {friend.name}
              </h3>
              <p className="text-[11px] font-jetbrains-mono text-on-surface-variant">
                Itemized split entries & settlements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container-high transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current status bar with Settle and Share actions */}
        <div className="flex items-center justify-between rounded-2xl border border-outline-variant/40 bg-surface-container-low p-3 text-xs">
          <div>
            <span className="text-on-surface-variant font-jetbrains-mono text-[11px]">Current Balance: </span>
            <span
              className={`font-jetbrains-mono font-bold text-sm ${
                friend.balance > 0
                  ? "text-emerald-500"
                  : friend.balance < 0
                  ? "text-error"
                  : "text-on-surface"
              }`}
            >
              {friend.balance > 0 ? "+" : friend.balance < 0 ? "−" : ""}
              {formatCurrency(Math.abs(friend.balance), currency)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onShare(friend, ledger)}
              className="h-7 px-2.5 rounded-full border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high text-[11px] font-jetbrains-mono font-bold text-on-surface flex items-center gap-1 transition-colors"
            >
              <Share2 className="h-3 w-3" />
              <span>Share</span>
            </button>

            {friend.balance !== 0 && (
              <button
                onClick={onSettle}
                className="h-7 px-3 rounded-full bg-primary hover:bg-primary/90 text-xs font-jetbrains-mono font-bold uppercase tracking-wider text-on-primary shadow-sm transition-all"
              >
                Settle
              </button>
            )}
          </div>
        </div>

        {/* Ledger Entries List */}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/20 pr-1 mt-2">
          {isLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-surface-container-low border border-outline-variant/40 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : ledger.length === 0 ? (
            <div className="py-8 text-center text-xs text-on-surface-variant font-jetbrains-mono">
              <History className="h-7 w-7 mx-auto mb-2 text-on-surface-variant/40" />
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
                  className="flex items-center justify-between py-2.5 px-1 text-xs hover:bg-surface-container-low/60 transition-colors rounded-xl"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-on-surface">
                      {isSettle ? (
                        <span className="font-jetbrains-mono text-primary text-[10px] uppercase border border-primary/30 bg-primary/10 px-1.5 py-0.5 rounded-full">
                          Settlement
                        </span>
                      ) : isBorrow ? (
                        <span className="font-jetbrains-mono text-error text-[10px] uppercase border border-error/30 bg-error/10 px-1.5 py-0.5 rounded-full">
                          You Owe
                        </span>
                      ) : (
                        <span className="font-jetbrains-mono text-emerald-500 text-[10px] uppercase border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          Owes You
                        </span>
                      )}
                      <span>— {entry.note || "Transaction"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-jetbrains-mono text-on-surface-variant pt-0.5">
                      <Calendar className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <div className="text-right font-jetbrains-mono font-bold">
                    <span
                      className={
                        isSettle
                          ? "text-primary"
                          : isBorrow
                          ? "text-error"
                          : "text-emerald-500"
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

