import { Timestamp } from "firebase/firestore";

export type TransactionType = "expense" | "income";
export type TransactionSource = "chat" | "manual";
export type LedgerEntryType = "owe" | "settle";

export interface FriendSplit {
  friendId: string;
  friendName: string;
  amount: number;
}

export interface Transaction {
  id?: string;
  groupId?: string; // Links multi-expense items created in the same batch
  type: TransactionType;
  amount: number;
  userShare: number;
  description: string;
  category: string;
  date: Date;
  createdAt: Date;
  rawInput: string;
  splits?: FriendSplit[];
  source: TransactionSource;
}

export interface Friend {
  id: string;
  name: string;
  balance: number; // positive = friend owes user, negative = user owes friend
  createdAt: Date;
}

export interface FriendLedgerEntry {
  id?: string;
  transactionId?: string;
  amount: number;
  type: LedgerEntryType;
  date: Date;
  note: string;
}

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  currency: string;
  createdAt: Date;
  defaultCategories?: string[];
}

export interface ParsedSplit {
  friendName: string;
  amount: number;
}

export interface ParsedExpense {
  type: TransactionType;
  totalAmount: number;
  userShare: number;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
  splits: ParsedSplit[];
  needsClarification?: boolean;
  clarificationQuestion?: string | null;
}

// Intent Router & Status Query Types (Addendum)
export type ChatIntent = "log_transaction" | "status_query" | "off_topic";
export type StatusQueryType = "balance" | "last_transactions" | "friend_debts" | "general_summary";

export interface StatusTransactionSummary {
  id?: string;
  description: string;
  category: string;
  amount: number;
  userShare: number;
  type: TransactionType;
  date: string;
}

export interface StatusFriendDebtSummary {
  friendId: string;
  friendName: string;
  balance: number; // positive = friend owes user, negative = user owes friend
}

export interface StatusQueryResult {
  queryType: StatusQueryType;
  balance?: number;
  totalIncome?: number;
  totalExpense?: number;
  transactions?: StatusTransactionSummary[];
  friendDebts?: StatusFriendDebtSummary[];
}

export type ChatMessageStatus =
  | "pending_confirmation"
  | "confirmed"
  | "cancelled"
  | "clarification"
  | "error"
  | "status_query"
  | "off_topic";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: ChatIntent | null;
  createdAt: Timestamp | Date | string | number;
  expireAt: Timestamp | Date | string | number; // createdAt + 2 hours
  parsedData?: ParsedExpense | null; // legacy single-item support
  parsedTransactions?: ParsedExpense[] | null; // multi-expense itemized array
  statusData?: StatusQueryResult | null;
  status?: ChatMessageStatus;
  transactionId?: string;
  groupId?: string;
  modelUsed?: string;
  error?: string;
}

export interface GroqModelStatus {
  modelId: string;
  rateLimitedUntil: Timestamp | Date | null;
  lastUsed: Timestamp | Date;
  lastError?: string | null;
}
