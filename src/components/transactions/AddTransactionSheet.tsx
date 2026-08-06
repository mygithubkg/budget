"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Plus, Trash2, Loader2, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useFriends } from "@/hooks/useFriends";
import { useAddTransaction } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { SplitDirection } from "@/types";

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTransactionSheet({
  open,
  onOpenChange,
}: AddTransactionSheetProps) {
  const { userProfile } = useAuth();
  const { data: categories = [] } = useCategories();
  const { data: friends = [] } = useFriends();
  const addTransactionMutation = useAddTransaction();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState<string>("");
  const [userShare, setUserShare] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [splits, setSplits] = useState<
    { friendName: string; amount: number; direction?: SplitDirection }[]
  >([]);

  // Split management
  const [newSplitFriend, setNewSplitFriend] = useState("");
  const [newSplitAmount, setNewSplitAmount] = useState("");
  const [newSplitDirection, setNewSplitDirection] = useState<SplitDirection>("they_owe_me");

  const handleAddSplit = () => {
    if (!newSplitFriend.trim()) {
      toast.error("Friend name is required");
      return;
    }
    const splitVal = parseFloat(newSplitAmount);
    if (isNaN(splitVal) || splitVal <= 0) {
      toast.error("Enter a valid split amount");
      return;
    }

    setSplits((prev) => [
      ...prev,
      { friendName: newSplitFriend.trim(), amount: splitVal, direction: newSplitDirection },
    ]);
    setNewSplitFriend("");
    setNewSplitAmount("");
    setNewSplitDirection("they_owe_me");

    const totalVal = parseFloat(amount) || 0;
    const currentFriendTotal =
      splits.reduce((acc, s) => acc + s.amount, 0) + splitVal;
    const remaining = Math.max(0, totalVal - currentFriendTotal);
    setUserShare(remaining.toString());
  };

  const handleRemoveSplit = (idx: number) => {
    const removedAmount = splits[idx].amount;
    setSplits((prev) => prev.filter((_, i) => i !== idx));
    const currentMyShare = parseFloat(userShare) || 0;
    setUserShare((currentMyShare + removedAmount).toString());
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val) || 0;
    const friendsTotal = splits.reduce((acc, s) => acc + s.amount, 0);
    setUserShare(Math.max(0, num - friendsTotal).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (!category) {
      toast.error("Please select a category");
      return;
    }

    const calculatedUserShare = parseFloat(userShare) || totalAmount;

    try {
      await addTransactionMutation.mutateAsync({
        type,
        amount: totalAmount,
        userShare: calculatedUserShare,
        description: description.trim(),
        category,
        date: new Date(date),
        rawInput: `Manual: ${description.trim()} (${type})`,
        source: "manual",
        splits: splits.map((s) => ({
          friendId: friends.find((f) => f.name.toLowerCase() === s.friendName.toLowerCase())?.id || "",
          friendName: s.friendName,
          amount: s.amount,
          direction: s.direction || "they_owe_me",
        })),
      });

      toast.success(
        `Recorded ${formatCurrency(totalAmount, userProfile?.currency)} in ledger`
      );
      setAmount("");
      setUserShare("");
      setDescription("");
      setCategory("");
      setSplits([]);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to log transaction");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto bg-card-bg border-l border-fiber-line text-ink-text p-6">
        <SheetHeader className="pb-4 border-b border-fiber-line">
          <SheetTitle className="font-display text-xl font-bold text-ink-text flex items-center gap-2">
            <span>Manual Register Entry</span>
          </SheetTitle>
          <SheetDescription className="text-xs font-mono text-muted-text">
            Log a debit or credit record directly into the ledger.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Type Toggle */}
          <div className="flex rounded-lg border border-fiber-line bg-paper-bg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setType("expense");
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[3px] transition-colors ${
                type === "expense"
                  ? "bg-stamp-red text-[#FFFFFF] font-bold"
                  : "text-muted-text hover:text-ink-text"
              }`}
            >
              <ArrowDownRight className="h-3.5 w-3.5" />
              <span>Debit / Expense</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType("income");
                setSplits([]);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[3px] transition-colors ${
                type === "income"
                  ? "bg-thrive-green text-[#FFFFFF] font-bold"
                  : "text-muted-text hover:text-ink-text"
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Credit / Income</span>
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-muted-text tracking-wider">
              Total Amount ({userProfile?.currency || "INR"})
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full h-10 rounded-lg border border-fiber-line bg-paper-bg px-3 text-base font-mono font-bold text-ink-text focus:border-stamp-red focus:outline-none"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-muted-text tracking-wider">
              Particulars / Description
            </label>
            <input
              placeholder="e.g. Dinner, Grocery run, Salary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full h-8 rounded-lg border border-fiber-line bg-paper-bg px-2.5 text-xs text-ink-text focus:border-stamp-red focus:outline-none"
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-muted-text tracking-wider">
              Ledger Account (Category)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-8 rounded-lg border border-fiber-line bg-paper-bg px-2.5 text-xs text-ink-text focus:border-stamp-red focus:outline-none"
              required
            >
              <option value="">Select an account</option>
              {categories.map((cat) => (
                <option key={cat.id || cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-muted-text tracking-wider">
              Date of Entry
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full h-8 rounded-lg border border-fiber-line bg-paper-bg px-2.5 text-xs font-mono text-ink-text focus:border-stamp-red focus:outline-none"
            />
          </div>

          {/* Splits section (Expenses only) */}
          {type === "expense" && (
            <div className="rounded-lg border border-fiber-line bg-paper-bg p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase text-ink-text tracking-wider">
                  Split with friends (optional)
                </span>
                <span className="text-[10px] font-mono text-muted-text">
                  Your share: {formatCurrency(parseFloat(userShare) || 0, userProfile?.currency)}
                </span>
              </div>

              {/* Existing splits */}
              {splits.length > 0 && (
                <div className="space-y-1.5 divide-y divide-fiber-line">
                  {splits.map((s, idx) => {
                    const isIOweThem = s.direction === "i_owe_them";
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between pt-1 text-xs font-mono"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-ink-text">{s.friendName}</span>
                          <span
                            className={`text-[9px] uppercase px-1 py-0.2 rounded-[2px] border font-bold ${
                              isIOweThem
                                ? "border-stamp-red/40 bg-stamp-red/10 text-stamp-red"
                                : "border-thrive-green/40 bg-thrive-green/10 text-thrive-green"
                            }`}
                          >
                            {isIOweThem ? "You owe" : "Owes you"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              isIOweThem ? "text-stamp-red" : "text-thrive-green"
                            }`}
                          >
                            {formatCurrency(s.amount, userProfile?.currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSplit(idx)}
                            className="text-muted-text hover:text-stamp-red"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Split row */}
              <div className="flex gap-1.5 pt-1">
                <input
                  placeholder="Friend name"
                  value={newSplitFriend}
                  onChange={(e) => setNewSplitFriend(e.target.value)}
                  className="h-8 text-xs flex-1 rounded-lg border border-fiber-line bg-card-bg px-2 text-ink-text focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newSplitAmount}
                  onChange={(e) => setNewSplitAmount(e.target.value)}
                  className="h-8 text-xs w-20 rounded-lg border border-fiber-line bg-card-bg px-2 font-mono text-ink-text focus:outline-none"
                />
                <select
                  value={newSplitDirection}
                  onChange={(e) => setNewSplitDirection(e.target.value as SplitDirection)}
                  className="h-8 text-[10px] font-mono uppercase font-bold rounded-lg border border-fiber-line bg-card-bg px-1 text-ink-text focus:outline-none"
                >
                  <option value="they_owe_me">Owes you</option>
                  <option value="i_owe_them">You owe</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddSplit}
                  className="h-8 px-2.5 rounded-lg border border-fiber-line bg-card-bg hover:border-stamp-red text-ink-text flex items-center justify-center shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={addTransactionMutation.isPending}
            className={`w-full h-10 rounded-lg font-mono font-bold text-xs uppercase tracking-wider text-[#FFFFFF] flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
              type === "income" ? "bg-thrive-green hover:bg-thrive-green/90" : "bg-stamp-red hover:bg-stamp-red/90"
            }`}
          >
            {addTransactionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            <span>Record {type === "income" ? "Credit" : "Debit"}</span>
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
