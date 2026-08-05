import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Transaction, FriendSplit } from "@/types";
import { format } from "date-fns";

export interface ExportRowRaw {
  date: string; // YYYY-MM-DD
  type: "Income" | "Expense";
  description: string;
  category: string;
  totalAmount: number;
  userShare: number;
  splitWith: string;
  runningBalance: number;
  source: string;
}

export interface ExportPDFRow {
  date: string; // DD Mon YYYY
  type: "Income" | "Expense";
  description: string;
  category: string;
  totalAmount: string;
  userShare: string;
  splitWith: string;
  runningBalance: string;
  source: string;
}

export interface ExportSummary {
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  netChange: number;
  closingBalance: number;
  transactionCount: number;
}

export interface PreparedExportData {
  csvExcelRows: ExportRowRaw[];
  pdfRows: ExportPDFRow[];
  summary: ExportSummary;
  fromDateStr: string;
  toDateStr: string;
  currency: string;
  currencySymbol: string;
  pdfCurrencySymbol: string;
}

export function getCurrencySymbol(currency: string = "INR"): string {
  switch (currency.toUpperCase()) {
    case "USD":
      return "$";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "JPY":
      return "¥";
    case "CAD":
      return "CA$";
    case "AUD":
      return "AU$";
    case "INR":
    default:
      return "₹";
  }
}

/**
 * Standard ASCII/Latin-1 compatible currency representation for jsPDF standard fonts.
 * Avoids unicode glyph corruption (e.g. ₹ U+20B9 is unsupported in built-in PDF fonts).
 */
export function getPDFCurrencySymbol(currency: string = "INR"): string {
  switch (currency.toUpperCase()) {
    case "USD":
      return "$";
    case "EUR":
      return "EUR ";
    case "GBP":
      return "£";
    case "JPY":
      return "¥";
    case "CAD":
      return "CA$ ";
    case "AUD":
      return "AU$ ";
    case "INR":
    default:
      return "Rs. ";
  }
}

/**
 * Format currency amount cleanly
 */
export function formatCurrency(
  val: number,
  symbol: string = "₹",
  includeSign: boolean = false
): string {
  const isNeg = val < 0;
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  });

  if (includeSign) {
    if (val > 0) return `+${symbol}${formatted}`;
    if (val < 0) return `-${symbol}${formatted}`;
    return `${symbol}${formatted}`;
  }

  return `${isNeg ? "-" : ""}${symbol}${formatted}`;
}

/**
 * Flatten friend splits into a clean human-readable string
 * e.g. "Manas: ₹20, Priya: ₹15"
 */
export function formatSplits(
  splits?: FriendSplit[],
  symbol: string = "₹"
): string {
  if (!splits || splits.length === 0) return "";
  return splits
    .map((s) => {
      const name = s.friendName || "Friend";
      const amt = s.amount || 0;
      const formattedAmt = formatCurrency(amt, symbol);
      return `${name}: ${formattedAmt}`;
    })
    .join(", ");
}

/**
 * Parse any Firestore date value (Timestamp, string, number, or Date) into a standard JS Date
 */
export function parseDocDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val?.toDate === "function") return val.toDate();
  if (typeof val?.toMillis === "function") return new Date(val.toMillis());
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Fetches the earliest recorded transaction date for a user
 */
export async function fetchEarliestTransactionDate(
  uid: string
): Promise<Date | null> {
  try {
    const q = query(
      collection(db, "users", uid, "transactions"),
      orderBy("date", "asc"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return parseDocDate(data.date);
  } catch (err) {
    console.error("Error fetching earliest transaction date:", err);
    return null;
  }
}

/**
 * Fetches all transactions for a user sorted by date ascending
 */
export async function fetchAllUserTransactions(
  uid: string
): Promise<Transaction[]> {
  try {
    const q = query(
      collection(db, "users", uid, "transactions"),
      orderBy("date", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      const amt = Number(data.amount) || 0;
      const userShare =
        data.userShare !== undefined && data.userShare !== null
          ? Number(data.userShare)
          : amt;

      return {
        id: docSnap.id,
        groupId: data.groupId || undefined,
        type: data.type === "income" ? "income" : "expense",
        amount: amt,
        userShare,
        description: data.description || "Transaction",
        category: data.category || "Miscellaneous",
        date: parseDocDate(data.date),
        createdAt: parseDocDate(data.createdAt),
        rawInput: data.rawInput || "",
        splits: data.splits || [],
        source: data.source || "manual",
      };
    });
  } catch (err) {
    console.error("Error fetching transactions for export:", err);
    return [];
  }
}

/**
 * Prepares and structures export rows, running balances, and summary statistics
 */
export function prepareExportData(
  allTransactions: Transaction[],
  fromDate: Date,
  toDate: Date,
  currency: string = "INR"
): PreparedExportData {
  const symbol = getCurrencySymbol(currency);
  const pdfSymbol = getPDFCurrencySymbol(currency);

  // Set boundary times
  const startOfDay = new Date(fromDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(toDate);
  endOfDay.setHours(23, 59, 59, 999);

  let openingBalance = 0;
  const filteredTx: Transaction[] = [];

  // Sort transactions chronologically
  const sorted = [...allTransactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  sorted.forEach((t) => {
    const tTime = t.date.getTime();
    if (tTime < startOfDay.getTime()) {
      if (t.type === "income") {
        openingBalance += t.amount;
      } else {
        openingBalance -= t.userShare;
      }
    } else if (tTime <= endOfDay.getTime()) {
      filteredTx.push(t);
    }
  });

  let currentRunningBalance = openingBalance;
  let totalIncome = 0;
  let totalExpense = 0;

  const csvExcelRows: ExportRowRaw[] = [];
  const pdfRows: ExportPDFRow[] = [];

  filteredTx.forEach((t) => {
    const isIncome = t.type === "income";
    if (isIncome) {
      currentRunningBalance += t.amount;
      totalIncome += t.amount;
    } else {
      currentRunningBalance -= t.userShare;
      totalExpense += t.userShare;
    }

    const isoDate = format(t.date, "yyyy-MM-dd");
    const humanDate = format(t.date, "dd MMM yyyy");
    const splitCsvStr = formatSplits(t.splits, symbol);
    const splitPdfStr = formatSplits(t.splits, pdfSymbol);
    const typeLabel = isIncome ? "Income" : "Expense";

    // Machine-readable row for CSV and Excel (raw numbers)
    csvExcelRows.push({
      date: isoDate,
      type: typeLabel,
      description: t.description,
      category: t.category,
      totalAmount: t.amount,
      userShare: t.userShare,
      splitWith: splitCsvStr,
      runningBalance: Math.round(currentRunningBalance * 100) / 100,
      source: t.source || "manual",
    });

    // Human-readable formatted row for PDF (uses PDF-safe font compatible currency representation)
    pdfRows.push({
      date: humanDate,
      type: typeLabel,
      description: t.description,
      category: t.category,
      totalAmount: formatCurrency(t.amount, pdfSymbol),
      userShare: formatCurrency(t.userShare, pdfSymbol),
      splitWith: splitPdfStr,
      runningBalance: formatCurrency(currentRunningBalance, pdfSymbol, true),
      source: t.source || "manual",
    });
  });

  const netChange = totalIncome - totalExpense;
  const closingBalance = openingBalance + netChange;

  return {
    csvExcelRows,
    pdfRows,
    summary: {
      openingBalance: Math.round(openingBalance * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netChange: Math.round(netChange * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      transactionCount: filteredTx.length,
    },
    fromDateStr: format(fromDate, "yyyy-MM-dd"),
    toDateStr: format(toDate, "yyyy-MM-dd"),
    currency,
    currencySymbol: symbol,
    pdfCurrencySymbol: pdfSymbol,
  };
}
