"use client";

import React, { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ParsedSplit } from "@/types";
import { formatCurrency } from "@/lib/currency";

interface SplitEditorProps {
  splits: ParsedSplit[];
  onChange: (splits: ParsedSplit[]) => void;
  currency?: string;
  totalAmount: number;
}

export function SplitEditor({
  splits,
  onChange,
  currency = "INR",
  totalAmount,
}: SplitEditorProps) {
  const [friendName, setFriendName] = useState("");
  const [amount, setAmount] = useState("");

  const handleAdd = () => {
    if (!friendName.trim()) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    onChange([...splits, { friendName: friendName.trim(), amount: val }]);
    setFriendName("");
    setAmount("");
  };

  const handleRemove = (index: number) => {
    onChange(splits.filter((_, i) => i !== index));
  };

  const handleUpdateAmount = (index: number, newAmt: number) => {
    const updated = [...splits];
    updated[index] = { ...updated[index], amount: newAmt };
    onChange(updated);
  };

  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-3 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
        <div className="flex items-center gap-1.5 text-primary">
          <Users className="h-3.5 w-3.5" />
          <span>Friend Splits</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {splits.length} friend{splits.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* List of current splits */}
      {splits.length > 0 && (
        <div className="space-y-1.5">
          {splits.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 rounded-lg bg-card px-2.5 py-1.5 text-xs border border-border/60"
            >
              <span className="font-medium text-foreground">{s.friendName}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={s.amount}
                  onChange={(e) =>
                    handleUpdateAmount(idx, parseFloat(e.target.value) || 0)
                  }
                  className="h-7 w-20 text-xs text-right font-semibold text-rose-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="text-muted-foreground hover:text-destructive p-0.5"
                  title="Remove split"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new split input row */}
      <div className="flex items-center gap-1.5 pt-1">
        <Input
          placeholder="Friend name"
          value={friendName}
          onChange={(e) => setFriendName(e.target.value)}
          className="h-7 text-xs flex-1"
        />
        <Input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-7 text-xs w-20"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAdd}
          className="h-7 px-2"
          disabled={!friendName || !amount}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
