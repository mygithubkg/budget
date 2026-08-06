"use client";

import React, { useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { ParsedSplit, SplitDirection } from "@/types";
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
  const [direction, setDirection] = useState<SplitDirection>("they_owe_me");

  const handleAdd = () => {
    if (!friendName.trim()) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    onChange([
      ...splits,
      { friendName: friendName.trim(), amount: val, direction },
    ]);
    setFriendName("");
    setAmount("");
    setDirection("they_owe_me");
  };

  const handleRemove = (index: number) => {
    onChange(splits.filter((_, i) => i !== index));
  };

  const handleUpdateAmount = (index: number, newAmt: number) => {
    const updated = [...splits];
    updated[index] = { ...updated[index], amount: newAmt };
    onChange(updated);
  };

  const handleToggleDirection = (index: number) => {
    const updated = [...splits];
    const current = updated[index].direction || "they_owe_me";
    updated[index] = {
      ...updated[index],
      direction: current === "they_owe_me" ? "i_owe_them" : "they_owe_me",
    };
    onChange(updated);
  };

  return (
    <div className="rounded-lg border border-fiber-line bg-paper-bg/60 p-3 space-y-2.5 text-ink-text">
      <div className="flex items-center justify-between text-xs font-mono font-bold">
        <div className="flex items-center gap-1.5 text-stamp-red">
          <Users className="h-3.5 w-3.5" />
          <span>Friend Ledger Splits</span>
        </div>
        <span className="text-[10px] text-muted-text uppercase">
          {splits.length} friend{splits.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* List of current splits */}
      {splits.length > 0 && (
        <div className="space-y-1.5">
          {splits.map((s, idx) => {
            const isIOweThem = s.direction === "i_owe_them";
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 rounded-lg bg-card-bg px-2.5 py-1.5 text-xs border border-fiber-line font-mono"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-bold text-ink-text truncate">{s.friendName}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleDirection(idx)}
                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded-[2px] border font-bold ${
                      isIOweThem
                        ? "border-stamp-red/40 bg-stamp-red/10 text-stamp-red"
                        : "border-thrive-green/40 bg-thrive-green/10 text-thrive-green"
                    }`}
                  >
                    {isIOweThem ? "You owe" : "Owes you"}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={s.amount}
                    onChange={(e) =>
                      handleUpdateAmount(idx, parseFloat(e.target.value) || 0)
                    }
                    className="h-7 w-20 text-xs text-right font-mono font-bold rounded-[3px] border border-fiber-line bg-card-bg px-2 text-ink-text focus:outline-none focus:border-stamp-red"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(idx)}
                    className="text-muted-text hover:text-stamp-red p-0.5 transition-colors"
                    title="Remove split"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new split input row */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center gap-1.5">
          <input
            placeholder="Friend name"
            value={friendName}
            onChange={(e) => setFriendName(e.target.value)}
            className="h-7 text-xs font-sans rounded-lg border border-fiber-line bg-card-bg px-2 flex-1 text-ink-text focus:outline-none focus:border-stamp-red"
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-7 text-xs font-mono rounded-lg border border-fiber-line bg-card-bg px-2 w-20 text-right text-ink-text focus:outline-none focus:border-stamp-red"
          />
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as SplitDirection)}
            className="h-7 text-[10px] font-mono uppercase font-bold rounded-lg border border-fiber-line bg-card-bg px-1 text-ink-text focus:outline-none focus:border-stamp-red"
          >
            <option value="they_owe_me">Owes you</option>
            <option value="i_owe_them">You owe</option>
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!friendName || !amount}
            className="h-7 px-2 rounded-lg bg-stamp-red text-[#FFFFFF] hover:bg-stamp-red/90 disabled:opacity-50 flex items-center justify-center transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
