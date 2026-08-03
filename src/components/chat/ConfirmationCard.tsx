"use client";

import React, { useState } from "react";
import { ParsedExpense, ParsedSplit } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Tag,
  Edit2,
  Check,
  Loader2,
  Sparkles,
  Trash2,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useCategories } from "@/hooks/useCategories";

interface ConfirmationCardProps {
  transactions?: ParsedExpense[];
  parsedData?: ParsedExpense; // backward compatibility
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

  // Synchronize state if transactions prop updates
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

  // Calculations for running total
  const totalAmount = items.reduce((acc, it) => acc + (it.totalAmount || 0), 0);
  const totalUserShare = items.reduce((acc, it) => acc + (it.userShare || 0), 0);
  const totalItemsCount = items.length;

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-lg border border-border/80 bg-card/95 shadow-xl backdrop-blur-md overflow-hidden animate-in fade-in-50 zoom-in-95 duration-200">
      {/* Header bar */}
      <div className="px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-200" />
          <span>
            Review {totalItemsCount === 1 ? "Expense" : `${totalItemsCount} Parsed Expenses`}
          </span>
        </div>
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-medium">
          {totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}
        </span>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Itemized Rows List */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5">
          {items.map((item, idx) => {
            const isEditing = editingIndex === idx;
            const isIncome = item.type === "income";

            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all p-3 text-xs ${
                  isEditing
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "border-border/60 bg-background/80 hover:border-border"
                }`}
              >
                {isEditing ? (
                  /* Edit Mode for Row */
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={item.description}
                        onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                        placeholder="Description"
                        className="h-7 text-xs font-medium flex-1"
                      />
                      <Input
                        type="number"
                        value={item.totalAmount}
                        onChange={(e) =>
                          handleUpdateItem(idx, "totalAmount", parseFloat(e.target.value) || 0)
                        }
                        className="h-7 w-24 text-right text-xs font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <Select
                        value={item.category}
                        onValueChange={(val) => handleUpdateItem(idx, "category", val)}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-36">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id || c.name} value={c.name}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => handleUpdateItem(idx, "date", e.target.value)}
                        className="h-7 text-[11px] w-32"
                      />

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingIndex(null)}
                        className="h-7 px-2.5 text-[11px] gap-1 shrink-0"
                      >
                        <Check className="h-3 w-3" /> Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Preview Mode for Row */
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          isIncome
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownRight className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>

                      <div className="truncate">
                        <p className="font-semibold text-foreground text-sm truncate">
                          {item.description || "Expense"}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                            {item.category}
                          </Badge>
                          <span>•</span>
                          <span>{item.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${
                            isIncome ? "text-emerald-500" : "text-foreground"
                          }`}
                        >
                          {formatCurrency(item.totalAmount, currency)}
                        </div>
                        {item.splits && item.splits.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            Share: {formatCurrency(item.userShare, currency)}
                          </span>
                        )}
                      </div>

                      {/* Row Action Buttons */}
                      <button
                        type="button"
                        onClick={() => setEditingIndex(idx)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        title="Edit Item"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Friend Splits Preview if present */}
                {!isEditing && item.splits && item.splits.length > 0 && (
                  <div className="mt-2 rounded-xl bg-muted/40 px-2.5 py-1.5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    {item.splits.map((s, sIdx) => (
                      <span key={sIdx} className="text-rose-500 font-medium">
                        {s.friendName} owes {formatCurrency(s.amount, currency)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Running Total Footer Summary */}
        <div className="rounded-2xl bg-gradient-to-r from-muted/60 via-card to-muted/60 border border-border/80 p-3 flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground font-medium">
              Total ({totalItemsCount} {totalItemsCount === 1 ? "item" : "items"}):
            </span>
            {totalUserShare !== totalAmount && (
              <p className="text-[11px] text-muted-foreground pt-0.5">
                Your net share: <b className="text-foreground">{formatCurrency(totalUserShare, currency)}</b>
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-foreground tracking-tight">
              {formatCurrency(totalAmount, currency)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="gradient"
            className="flex-1 h-10 gap-1.5 shadow-md shadow-indigo-500/20"
            onClick={handleConfirmAll}
            disabled={isSaving || totalAmount <= 0}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>Confirm All ({totalItemsCount})</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 px-4 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onCancel}
            disabled={isSaving}
          >
            <XCircle className="h-4 w-4 mr-1" />
            <span>Discard</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
