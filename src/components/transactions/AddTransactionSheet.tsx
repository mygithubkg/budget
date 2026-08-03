"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useFriends } from "@/hooks/useFriends";
import { useAddTransaction } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";

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
  const [splits, setSplits] = useState<{ friendName: string; amount: number }[]>([]);

  // Split management
  const [newSplitFriend, setNewSplitFriend] = useState("");
  const [newSplitAmount, setNewSplitAmount] = useState("");

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
      { friendName: newSplitFriend.trim(), amount: splitVal },
    ]);
    setNewSplitFriend("");
    setNewSplitAmount("");

    // Auto update userShare if total amount is present
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
        })),
      });

      toast.success(
        `Logged ${formatCurrency(totalAmount, userProfile?.currency)} for ${description}`
      );
      // Reset
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
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <span>Add Transaction</span>
          </SheetTitle>
          <SheetDescription>
            Log a new expense or income record manually.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <Tabs
            value={type}
            onValueChange={(v) => {
              setType(v as "expense" | "income");
              if (v === "income") setSplits([]);
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="expense"
                className="data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-500 font-semibold"
              >
                <ArrowDownCircle className="h-4 w-4 mr-1.5" />
                Expense
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500 font-semibold"
              >
                <ArrowUpCircle className="h-4 w-4 mr-1.5" />
                Income
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Total Amount ({userProfile?.currency || "INR"})</Label>
            <Input
              id="amount"
              type="number"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="text-lg font-semibold"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g. Dinner, Grocery run, Salary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id || cat.name} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Splits section (Expenses only) */}
          {type === "expense" && (
            <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Split with friends (optional)
                </span>
                <span className="text-xs text-muted-foreground">
                  Your share: {formatCurrency(parseFloat(userShare) || 0, userProfile?.currency)}
                </span>
              </div>

              {/* Existing splits */}
              {splits.length > 0 && (
                <div className="space-y-1.5">
                  {splits.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-background p-2 text-xs border border-border/60"
                    >
                      <span className="font-medium">{s.friendName}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-rose-500">
                          {formatCurrency(s.amount, userProfile?.currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSplit(idx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Split row */}
              <div className="flex gap-2">
                <Input
                  placeholder="Friend name"
                  value={newSplitFriend}
                  onChange={(e) => setNewSplitFriend(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <Input
                  type="number"
                  placeholder="Amount"
                  value={newSplitAmount}
                  onChange={(e) => setNewSplitAmount(e.target.value)}
                  className="h-8 text-xs w-24"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddSplit}
                  className="h-8 px-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant={type === "income" ? "income" : "expense"}
            className="w-full h-11 mt-4"
            disabled={addTransactionMutation.isPending}
          >
            {addTransactionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Log {type === "income" ? "Income" : "Expense"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
