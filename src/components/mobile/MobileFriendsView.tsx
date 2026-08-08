"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { Friend } from "@/types";
import { useFriendLedger } from "@/hooks/useFriends";
import { useAuth } from "@/contexts/AuthContext";
import { GroupsListView } from "@/components/groups/GroupsListView";
import { ShareStatementModal } from "@/components/friends/ShareStatementModal";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { format } from "date-fns";

interface MobileFriendsViewProps {
  friends: Friend[];
  currency: string;
  onSelectFriend: (friend: Friend) => void;
  onOpenSettle: (friend: Friend) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileFriendsView({
  friends,
  currency,
  onOpenSettle,
  activeTab,
  onTabChange,
}: MobileFriendsViewProps) {
  const { userProfile, user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);

  // Friend ledger entries query
  const { data: ledgerEntries = [], isLoading: isLedgerLoading } = useFriendLedger(
    selectedFriend?.id
  );

  const totalOwedToYou = friends
    .filter((f) => f.balance > 0)
    .reduce((sum, f) => sum + f.balance, 0);

  const totalYouOwe = friends
    .filter((f) => f.balance < 0)
    .reduce((sum, f) => sum + Math.abs(f.balance), 0);

  return (
    <div className="space-y-4 pb-20">
      {/* ── Header ── */}
      <div className="space-y-1 px-1">
        <h2 className="text-xl font-bold tracking-tight text-md-on-surface font-inter">
          Shared Balances
        </h2>
        <p className="text-xs text-md-on-surface-variant font-inter">
          Track shared debts, 1:1 splits & group trip expenses
        </p>
      </div>

      {/* ── Segmented Tab Switcher (Debts vs Groups) ── */}
      <div className="flex rounded-full bg-md-surface-container-high border border-fiber-line dark:border-white/[0.06] p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            setSelectedFriend(null);
            onTabChange("direct");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-center transition-all font-inter ${
            activeTab === "direct" || !activeTab
              ? "bg-md-surface-bright text-md-on-surface font-bold shadow-sm"
              : "text-md-on-surface-variant hover:text-md-on-surface"
          }`}
        >
          <MaterialIcon name="person" size={16} fill={activeTab === "direct"} />
          <span>Debts (1:1)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedFriend(null);
            onTabChange("groups");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-center transition-all font-inter ${
            activeTab === "groups"
              ? "bg-md-surface-bright text-md-on-surface font-bold shadow-sm"
              : "text-md-on-surface-variant hover:text-md-on-surface"
          }`}
        >
          <MaterialIcon name="groups" size={16} fill={activeTab === "groups"} />
          <span>Groups</span>
        </button>
      </div>

      {activeTab === "groups" ? (
        /* ── Groups Sub-Tab ── */
        <div className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow">
          <GroupsListView />
        </div>
      ) : (
        /* ── Debts (Direct Friends) Sub-Tab ── */
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {selectedFriend ? (
              /* ── Selected Friend Detail Ledger View ── */
              <motion.div
                key="friend-detail"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-3.5"
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setSelectedFriend(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-md-on-surface-variant hover:text-md-on-surface font-inter px-1"
                >
                  <MaterialIcon name="arrow_back" size={16} />
                  <span>Back to all friends</span>
                </button>

                {/* Friend Balance Hero */}
                <div className="relative overflow-hidden rounded-[24px] bg-md-surface-container-high border border-fiber-line dark:border-white/[0.08] p-5 md-hero-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-md-primary/30 to-md-secondary/30 text-md-on-surface font-bold text-base ring-1 ring-md-outline/30 shadow-inner">
                        {selectedFriend.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-md-on-surface font-inter">
                          {selectedFriend.name}
                        </h3>
                        <span className="text-xs text-md-on-surface-variant font-inter">
                          {selectedFriend.balance > 0
                            ? "Owes you"
                            : selectedFriend.balance < 0
                            ? "You owe"
                            : "All settled up"}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-2xl font-bold font-jetbrains-mono tabular-nums ${
                          selectedFriend.balance > 0
                            ? "text-md-tertiary"
                            : selectedFriend.balance < 0
                            ? "text-md-error"
                            : "text-md-on-surface"
                        }`}
                      >
                        {selectedFriend.balance > 0
                          ? `+${formatCurrency(selectedFriend.balance, currency)}`
                          : selectedFriend.balance < 0
                          ? `−${formatCurrency(Math.abs(selectedFriend.balance), currency)}`
                          : formatCurrency(0, currency)}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Settle Up, Share Statement, Add Expense */}
                  <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-fiber-line dark:border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => onOpenSettle(selectedFriend)}
                      className="flex items-center justify-center gap-1 rounded-full bg-md-on-surface text-md-surface py-2.5 px-2 text-xs font-bold font-inter shadow-md active:scale-95 transition-transform"
                    >
                      <MaterialIcon name="handshake" size={15} />
                      <span>Settle</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShareModalOpen(true)}
                      className="flex items-center justify-center gap-1 rounded-full bg-md-primary-container/40 text-md-primary border border-md-primary/30 py-2.5 px-2 text-xs font-bold font-inter active:scale-95 transition-transform hover:bg-md-primary-container/60"
                    >
                      <MaterialIcon name="share" size={15} />
                      <span>Share</span>
                    </button>

                    <Link
                      href={`/chat?text=${encodeURIComponent(`Expense with ${selectedFriend.name}: `)}`}
                      className="flex items-center justify-center gap-1 rounded-full bg-md-surface-variant text-md-on-surface py-2.5 px-2 text-xs font-bold font-inter border border-fiber-line dark:border-white/[0.04] active:scale-95 transition-transform hover:bg-md-surface-bright"
                    >
                      <MaterialIcon name="add" size={15} />
                      <span>Expense</span>
                    </Link>
                  </div>
                </div>

                {/* Ledger entries history */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-bold tracking-[0.05em] uppercase text-md-on-surface-variant font-inter">
                      Activity History
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShareModalOpen(true)}
                      className="text-[11px] font-semibold text-md-primary flex items-center gap-1 font-inter hover:underline"
                    >
                      <MaterialIcon name="send" size={12} />
                      <span>Share Statement</span>
                    </button>
                  </div>

                  {isLedgerLoading ? (
                    <div className="rounded-[24px] bg-md-surface-container p-6 text-center text-xs text-md-on-surface-variant font-inter animate-pulse">
                      Loading ledger entries...
                    </div>
                  ) : ledgerEntries.length === 0 ? (
                    <div className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-6 text-center text-xs text-md-on-surface-variant font-inter">
                      No recorded transactions with {selectedFriend.name} yet.
                    </div>
                  ) : (
                    ledgerEntries.map((entry, idx) => {
                      const entryDate =
                        entry.date instanceof Date
                          ? entry.date
                          : new Date(entry.date as any);
                      const isCredit = entry.type === "owe" || entry.direction === "they_owe_me";
                      const isSettle = entry.type === "settle";

                      return (
                        <div
                          key={entry.id || idx}
                          className="flex items-center justify-between rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-3.5 md-card-shadow"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-sm font-semibold text-md-on-surface font-inter truncate">
                              {entry.note || (isSettle ? "Settled Up" : "Shared Expense")}
                            </p>
                            <p className="text-xs text-md-on-surface-variant font-inter mt-0.5">
                              {format(entryDate, "MMM dd, yyyy")}
                            </p>
                          </div>
                          <span
                            className={`font-jetbrains-mono font-bold text-sm tabular-nums flex-shrink-0 ${
                              isSettle
                                ? "text-md-primary"
                                : isCredit
                                ? "text-md-tertiary"
                                : "text-md-error"
                            }`}
                          >
                            {isSettle ? "✓ " : isCredit ? "+" : "−"}
                            {formatCurrency(entry.amount, currency)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            ) : (
              /* ── All Direct Friends List ── */
              <motion.div
                key="friends-list"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* ── Summary Pills (You Owe vs You Are Owed) ── */}
                <div className="grid grid-cols-2 gap-3">
                  {/* You Owe Card */}
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-md-error-container/30 text-md-error">
                        <MaterialIcon name="arrow_upward" size={12} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
                        You Owe
                      </span>
                    </div>
                    <p className="mt-1 text-xl font-bold text-md-error font-jetbrains-mono tabular-nums">
                      {formatCurrency(totalYouOwe, currency)}
                    </p>
                  </motion.div>

                  {/* You Are Owed Card */}
                  <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
                    className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-4 md-card-shadow"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-md-tertiary-container/30 text-md-tertiary">
                        <MaterialIcon name="arrow_downward" size={12} />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-md-on-surface-variant font-inter">
                        You Are Owed
                      </span>
                    </div>
                    <p className="mt-1 text-xl font-bold text-md-tertiary font-jetbrains-mono tabular-nums">
                      {formatCurrency(totalOwedToYou, currency)}
                    </p>
                  </motion.div>
                </div>

                {/* ── Friends List ── */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold tracking-[0.05em] uppercase text-md-on-surface-variant font-inter">
                      Contacts ({friends.length})
                    </h3>
                    <span className="text-[11px] text-md-on-surface-variant font-inter">
                      Tap for details & settle up
                    </span>
                  </div>

                  {friends.length === 0 ? (
                    <div className="rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-8 text-center md-card-shadow">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-md-surface-container-high text-md-on-surface-variant">
                        <MaterialIcon name="group" size={24} />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-md-on-surface font-inter">
                        No friends added yet
                      </p>
                      <p className="text-xs text-md-on-surface-variant mt-1 font-inter">
                        Shared expenses recorded with friends will automatically appear here.
                      </p>
                    </div>
                  ) : (
                    friends.map((friend, idx) => {
                      const owesYou = friend.balance > 0;
                      const youOwe = friend.balance < 0;
                      const isSettled = friend.balance === 0;

                      return (
                        <motion.div
                          key={friend.id || idx}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.3,
                            delay: idx * 0.04,
                            ease: "easeOut",
                          }}
                          onClick={() => setSelectedFriend(friend)}
                          className="flex items-center justify-between rounded-[24px] bg-md-surface-container border border-fiber-line dark:border-white/[0.06] p-3.5 md-card-shadow cursor-pointer hover:border-md-outline/40 transition-colors"
                        >
                          {/* Left: Avatar + Name */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-md-primary/30 to-md-secondary/30 text-md-on-surface font-bold text-sm ring-1 ring-md-outline/30 shadow-inner">
                              {friend.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-md-on-surface font-inter truncate">
                                {friend.name}
                              </p>
                              <p className="text-xs text-md-on-surface-variant font-inter truncate">
                                Direct contact
                              </p>
                            </div>
                          </div>

                          {/* Right: Balance Pill Status */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {owesYou && (
                              <span className="rounded-full bg-md-tertiary-container/20 px-3 py-1 text-xs font-semibold text-md-tertiary font-jetbrains-mono tabular-nums">
                                Owes you {formatCurrency(friend.balance, currency)}
                              </span>
                            )}
                            {youOwe && (
                              <span className="rounded-full bg-md-error-container/20 px-3 py-1 text-xs font-semibold text-md-error font-jetbrains-mono tabular-nums">
                                You owe {formatCurrency(Math.abs(friend.balance), currency)}
                              </span>
                            )}
                            {isSettled && (
                              <span className="flex items-center gap-1 text-xs text-md-on-surface-variant font-medium font-inter">
                                <MaterialIcon name="check_circle" size={16} className="text-md-tertiary" />
                                <span>Settled up</span>
                              </span>
                            )}
                            <MaterialIcon name="chevron_right" size={20} className="text-md-on-surface-variant" />
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Share Statement Modal */}
      {selectedFriend && (
        <ShareStatementModal
          friend={selectedFriend}
          ledgerEntries={ledgerEntries}
          isLoading={isLedgerLoading}
          currency={currency}
          userName={userProfile?.displayName || user?.displayName || "Account Holder"}
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}

export default MobileFriendsView;

