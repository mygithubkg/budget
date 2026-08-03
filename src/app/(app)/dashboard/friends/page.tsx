"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends, useFriendLedger, useSettleUp } from "@/hooks/useFriends";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  UserCheck,
  ArrowUpRight,
  ArrowDownRight,
  HandCoins,
  History,
  Calendar,
  CheckCircle2,
  Receipt,
  Loader2,
  ChevronRight,
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Friends & Debt Tracker
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Track who owes you and who you owe from shared expenses and split bills.
        </p>
      </div>

      {/* 3 Top Summary Metric Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard
            title="Friends Owe You"
            value={formatCurrency(totalOwedToYou, currency)}
            subtitle={`${friends.filter((f) => f.balance > 0).length} friends with pending balance`}
            icon={ArrowUpRight}
            colorScheme="income"
          />
          <StatsCard
            title="You Owe Friends"
            value={formatCurrency(totalYouOwe, currency)}
            subtitle={`${friends.filter((f) => f.balance < 0).length} debts pending`}
            icon={ArrowDownRight}
            colorScheme="expense"
          />
          <StatsCard
            title="Net Friends Position"
            value={formatCurrency(netBalance, currency)}
            subtitle={
              netBalance >= 0 ? "You are in positive balance" : "You are in negative balance"
            }
            icon={HandCoins}
            colorScheme={netBalance >= 0 ? "primary" : "expense"}
          />
        </div>
      )}

      {/* Friends Ledger List */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Friend Balances</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Tap on any friend to view their itemized transaction ledger or settle up.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {friends.length} friend{friends.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : friends.length === 0 ? (
            <EmptyState
              title="No friend debts recorded"
              description="Whenever you split an expense in Chat (e.g. 'Dinner 600, Rohit owes 300'), Rohit will appear here automatically."
            />
          ) : (
            <div className="space-y-2.5">
              {friends.map((friend) => {
                const owesYou = friend.balance > 0;
                const youOwe = friend.balance < 0;
                const isSettled = friend.balance === 0;

                return (
                  <div
                    key={friend.id}
                    onClick={() => setSelectedFriend(friend)}
                    className="group cursor-pointer flex items-center justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {getInitials(friend.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                          {friend.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isSettled ? (
                            <span className="text-muted-foreground">All settled up</span>
                          ) : owesYou ? (
                            <span className="text-emerald-500 font-medium">
                              Owes you {formatCurrency(friend.balance, currency)}
                            </span>
                          ) : (
                            <span className="text-rose-500 font-medium">
                              You owe {formatCurrency(Math.abs(friend.balance), currency)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isSettled && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 border-primary/30 hover:bg-primary/5 hover:text-primary"
                          onClick={(e) => handleOpenSettle(friend, e)}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Settle</span>
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Friend Detail & Ledger Modal */}
      {selectedFriend && !settleModalOpen && (
        <FriendLedgerModal
          friend={selectedFriend}
          currency={currency}
          onClose={() => setSelectedFriend(null)}
          onSettle={() => handleOpenSettle(selectedFriend)}
        />
      )}

      {/* Settle Up Dialog */}
      <Dialog open={settleModalOpen} onOpenChange={setSettleModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleConfirmSettle}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HandCoins className="h-5 w-5 text-primary" />
                <span>Settle Up with {selectedFriend?.name}</span>
              </DialogTitle>
              <DialogDescription>
                Current balance:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(selectedFriend?.balance || 0, currency)}
                </span>
                . Enter the amount being settled.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="settle-amount">Settlement Amount ({currency})</Label>
                <Input
                  id="settle-amount"
                  type="number"
                  step="any"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settle-note">Note (optional)</Label>
                <Input
                  id="settle-note"
                  value={settleNote}
                  onChange={(e) => setSettleNote(e.target.value)}
                  placeholder="e.g. Paid via UPI, Cash given"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSettleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="gradient"
                disabled={settleUpMutation.isPending}
              >
                {settleUpMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                )}
                Record Settlement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                {friend.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">{friend.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  Itemized ledger of shared bills & settlements
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Current status bar */}
        <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 text-xs">
          <div>
            <span className="text-muted-foreground">Current Balance: </span>
            <span
              className={`font-bold text-sm ${
                friend.balance > 0
                  ? "text-emerald-500"
                  : friend.balance < 0
                  ? "text-rose-500"
                  : "text-foreground"
              }`}
            >
              {friend.balance > 0 ? "+" : ""}
              {formatCurrency(friend.balance, currency)}
            </span>
          </div>

          {friend.balance !== 0 && (
            <Button size="sm" variant="gradient" className="h-7 text-xs" onClick={onSettle}>
              Settle Balance
            </Button>
          )}
        </div>

        {/* Ledger Entries List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mt-2">
          {isLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : ledger.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>No historical ledger entries found for {friend.name}.</p>
            </div>
          ) : (
            ledger.map((entry) => {
              const isSettle = entry.type === "settle";
              const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date as any);
              const formattedDate = format(entryDate, "dd MMM yyyy, h:mm a");

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      {isSettle ? (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Settlement
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-primary">
                          <Receipt className="h-3.5 w-3.5" />
                          Split Share
                        </span>
                      )}
                      <span>— {entry.note || "Transaction"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-bold ${
                        isSettle ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {isSettle ? "-" : "+"}
                      {formatCurrency(entry.amount, currency)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
