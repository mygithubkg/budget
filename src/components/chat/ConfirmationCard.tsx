"use client";

import React, { useState } from "react";
import { ParsedExpense } from "@/types";
import {
  Calendar,
  Edit2,
  Check,
  Loader2,
  Trash2,
  X,
  BookOpen,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useCategories } from "@/hooks/useCategories";

interface ConfirmationCardProps {
  transactions?: ParsedExpense[];
  parsedData?: ParsedExpense;
  currency?: string;
  onConfirm: (finalList: ParsedExpense[]) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function ConfirmationCard({
  transactions,
  parsedData,
  currency = "INR",
  onConfirm,
  onCancel,
  isSaving = false,
}: ConfirmationCardProps) {
  const { data: categories = [] } = useCategories();

  const initialItems: ParsedExpense[] =
    transactions && transactions.length > 0
      ? transactions
      : parsedData
      ? [parsedData]
      : [];

  const [items, setItems] = useState<ParsedExpense[]>(initialItems);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  React.useEffect(() => {
    if (transactions && transactions.length > 0) {
      setItems(transactions);
    } else if (parsedData) {
      setItems([parsedData]);
    }
  }, [transactions, parsedData]);

  const handleUpdateItem = (index: number, field: keyof ParsedExpense, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const current = { ...next[index], [field]: value };

      if (field === "totalAmount") {
        const friendTotal = (current.splits || []).reduce((acc, s) => acc + s.amount, 0);
        current.userShare = Math.max(0, Number(value) - friendTotal);
      }

      next[index] = current;
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length === 0) {
        onCancel();
      }
      return next;
    });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const handleConfirmAll = async () => {
    if (items.length === 0) return;
    await onConfirm(items);
  };

  const totalAmount = items.reduce((acc, it) => acc + (it.totalAmount || 0), 0);
  const totalUserShare = items.reduce((acc, it) => acc + (it.userShare || 0), 0);
  const totalItemsCount = items.length;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-lg rounded-[8px] border border-fiber-line bg-card-bg shadow-sm overflow-hidden text-ink-text">
      {/* Header bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-fiber-line bg-paper-bg">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-stamp-indigo" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink-text">
            {totalItemsCount === 1 ? "Review Entry" : `Review ${totalItemsCount} Entries`}
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase text-muted-text px-1.5 py-0.5 border border-fiber-line rounded-[3px]">
          {totalItemsCount} {totalItemsCount === 1 ? "line" : "lines"}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Itemized Rows List */}
        <div className="space-y-0 divide-y divide-fiber-line max-h-[380px] overflow-y-auto">
          {items.map((item, idx) => {
            const isEditing = editingIndex === idx;
            const isIncome = item.type === "income";

            return (
              <div
                key={idx}
                className={`relative py-3 px-3 transition-colors ${
                  isEditing ? "bg-paper-bg" : "hover:bg-paper-bg/60"
                }`}
              >
                {/* Red margin rule motif on the left */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-[2.5px]"
                  style={{
                    backgroundColor: isIncome ? "var(--passbook-gold)" : "var(--rule-red)",
                  }}
                />

                {isEditing ? (
                  /* Edit Mode for Row */
                  <div className="space-y-2 pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={item.description}
                        onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                        placeholder="Description"
                        className="h-7 text-xs font-sans rounded-[4px] border border-fiber-line bg-card-bg px-2 flex-1 text-ink-text focus:border-stamp-indigo focus:outline-none"
                      />
                      <input
                        type="number"
                        value={item.totalAmount}
                        onChange={(e) =>
                          handleUpdateItem(idx, "totalAmount", parseFloat(e.target.value) || 0)
                        }
                        className="h-7 w-24 text-right text-xs font-mono font-bold rounded-[4px] border border-fiber-line bg-card-bg px-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdateItem(idx, "category", e.target.value)}
                        className="h-7 text-[11px] font-sans rounded-[4px] border border-fiber-line bg-card-bg px-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c.id || c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => handleUpdateItem(idx, "date", e.target.value)}
                        className="h-7 text-[11px] font-mono rounded-[4px] border border-fiber-line bg-card-bg px-2 text-ink-text focus:border-stamp-indigo focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="h-7 px-2.5 rounded-[4px] border border-fiber-line bg-card-bg hover:border-stamp-indigo text-[11px] font-mono uppercase font-bold text-stamp-indigo flex items-center gap-1 shrink-0"
                      >
                        <Check className="h-3 w-3" /> Done
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Preview Mode for Row */
                  <div className="flex items-center justify-between gap-3 pl-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-ink-text truncate">
                          {item.description || "Expense"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-text uppercase px-1.5 py-0.2 border border-fiber-line rounded-[2px]">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-muted-text pt-0.5">
                        {item.date}
                      </div>
                    </div>

                    {/* Right Aligned Tabular Monospace Amount */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-mono text-sm font-bold ${
                            isIncome ? "text-passbook-gold" : "text-ink-text"
                          }`}
                        >
                          {isIncome ? "+" : "−"}{formatCurrency(item.totalAmount, currency)}
                        </span>
                        {item.splits && item.splits.length > 0 && (
                          <div className="text-[10px] font-mono text-muted-text">
                            Share: {formatCurrency(item.userShare, currency)}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <button
                        type="button"
                        onClick={() => setEditingIndex(idx)}
                        className="p-1 rounded-[4px] text-muted-text hover:text-ink-text hover:bg-paper-bg transition-colors"
                        title="Edit Entry"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded-[4px] text-muted-text hover:text-rule-red hover:bg-paper-bg transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Friend Splits if present */}
                {!isEditing && item.splits && item.splits.length > 0 && (
                  <div className="mt-1.5 pl-2 flex flex-wrap gap-2 text-[10px] font-mono text-muted-text">
                    {item.splits.map((s, sIdx) => (
                      <span key={sIdx} className="text-rule-red">
                        {s.friendName} owes {formatCurrency(s.amount, currency)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Ledger Subtotal Line */}
        <div className="border-t-2 border-fiber-line pt-3 flex items-center justify-between text-xs">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-text">
              Total ({totalItemsCount} {totalItemsCount === 1 ? "entry" : "entries"}):
            </span>
            {totalUserShare !== totalAmount && (
              <p className="text-[10px] font-mono text-muted-text pt-0.5">
                Net personal share: <b className="text-ink-text">{formatCurrency(totalUserShare, currency)}</b>
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="font-mono text-lg font-bold text-ink-text">
              {formatCurrency(totalAmount, currency)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-[6px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-xs font-mono font-bold uppercase tracking-wider text-[#EDE7D6] transition-colors disabled:opacity-50"
            onClick={handleConfirmAll}
            disabled={isSaving || totalAmount <= 0}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>Confirm & Stamp ({totalItemsCount})</span>
          </button>

          <button
            type="button"
            className="h-9 px-3.5 rounded-[6px] border border-fiber-line bg-paper-bg hover:text-rule-red text-xs font-mono uppercase tracking-wider text-muted-text transition-colors"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="h-3.5 w-3.5 inline mr-1" />
            <span>Discard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
