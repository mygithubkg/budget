import { ImportPreviewItem, Transaction } from "@/types";
import { parseISO, differenceInCalendarDays } from "date-fns";

export interface DuplicateCheckOptions {
  existingTransactions: Array<{
    id?: string;
    amount: number;
    type: "expense" | "income";
    date: Date | string | { toDate?: () => Date };
    description?: string;
  }>;
  currency?: string;
}

/**
 * Checks candidate import items against user's existing transactions.
 * Flags as duplicate if an existing transaction matches:
 * 1. Absolute amount matches (|diff| < 0.01)
 * 2. Type matches (expense vs income)
 * 3. Date matches within ±1 calendar day
 *
 * Duplicate items have isDuplicate = true and selected = false by default.
 */
export function detectDuplicates(
  candidateItems: ImportPreviewItem[],
  existingTransactions: DuplicateCheckOptions["existingTransactions"],
  currency: string = "INR"
): ImportPreviewItem[] {
  // Normalize existing transaction dates to Date objects
  const normalizedExisting = existingTransactions.map((tx) => {
    let dateObj: Date;
    if (tx.date instanceof Date) {
      dateObj = tx.date;
    } else if (typeof tx.date === "object" && tx.date && typeof (tx.date as any).toDate === "function") {
      dateObj = (tx.date as any).toDate();
    } else if (typeof tx.date === "string") {
      dateObj = new Date(tx.date);
    } else {
      dateObj = new Date();
    }

    return {
      ...tx,
      dateObj,
    };
  });

  return candidateItems.map((item) => {
    let itemDate: Date;
    try {
      itemDate = parseISO(item.date);
      if (isNaN(itemDate.getTime())) {
        itemDate = new Date(item.date);
      }
    } catch {
      itemDate = new Date();
    }

    // Find any existing transaction matching amount, type, and date within ±1 day
    const matchingTx = normalizedExisting.find((existing) => {
      const sameType = existing.type === item.type;
      const sameAmount = Math.abs(existing.amount - item.amount) < 0.01;
      if (!sameType || !sameAmount) return false;

      const dayDiff = Math.abs(differenceInCalendarDays(itemDate, existing.dateObj));
      return dayDiff <= 1;
    });

    if (matchingTx) {
      const matchDateStr =
        matchingTx.dateObj instanceof Date && !isNaN(matchingTx.dateObj.getTime())
          ? matchingTx.dateObj.toISOString().split("T")[0]
          : "same period";

      return {
        ...item,
        isDuplicate: true,
        duplicateReason: `Matches existing ${item.type} of ${currency} ${item.amount.toFixed(2)} on ${matchDateStr}${matchingTx.description ? ` ("${matchingTx.description}")` : ""}`,
        selected: false, // Default unchecked for duplicates
      };
    }

    return {
      ...item,
      isDuplicate: false,
      duplicateReason: undefined,
      selected: true, // Default checked for non-duplicates
    };
  });
}
