import { Timestamp } from "firebase/firestore";

export type TransactionType = "expense" | "income";
export type TransactionSource = "chat" | "manual" | "telegram";
export type LedgerEntryType = "owe" | "borrow" | "settle";
export type SplitDirection = "they_owe_me" | "i_owe_them";

export interface FriendSplit {
  friendId: string;
  friendName: string;
  amount: number;
  direction?: SplitDirection; // "they_owe_me" (friend owes user) | "i_owe_them" (user owes friend)
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
  direction?: SplitDirection;
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
  createdAt: Timestamp | Date | string;
  defaultCategories?: string[];
  telegramChatId?: string | number | null;
}

export interface LinkCodeDoc {
  code: string;
  uid: string;
  createdAt: Timestamp | Date | string | number;
  expiresAt: Timestamp | Date | string | number; // 10 minutes TTL
  used: boolean;
}

export interface TelegramLinkDoc {
  uid: string;
  chatId: number | string;
  username?: string | null;
  firstName?: string | null;
  linkedAt: Timestamp | Date | string | number;
}

export interface TelegramSessionDoc {
  id?: string;
  uid: string;
  chatId: number | string;
  transactions: ParsedExpense[];
  createdAt: Timestamp | Date | string | number;
  expiresAt: Timestamp | Date | string | number;
  status: "pending" | "confirmed" | "cancelled";
}

export interface ParsedSplit {
  friendName: string;
  amount: number;
  direction?: SplitDirection; // "they_owe_me" | "i_owe_them"
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
  messageType?: "standard" | "recap";
  recapData?: {
    period: "weekly" | "monthly";
    projection?: {
      narrative: string;
      projectedTotal: number;
      comparedToAverage: string;
    };
    patterns?: Array<{ title: string; narrative: string }>;
    opportunities?: Array<{ title: string; narrative: string; category: string | null }>;
    stats?: {
      totalExpense: number;
      totalIncome: number;
      savingsRate: number;
      projectedMonthEndExpense: number;
      projectedDiffPercentage: number;
    };
  };
}

export interface GroqModelStatus {
  modelId: string;
  rateLimitedUntil: Timestamp | Date | null;
  lastUsed: Timestamp | Date;
  lastError?: string | null;
}

export interface ChatProcessResult {
  intent: ChatIntent;
  transactions: ParsedExpense[] | null;
  queryType: StatusQueryType | null;
  statusData?: StatusQueryResult | null;
  replyText: string;
  modelUsed?: string;
  rateLimitExhausted?: boolean;
}
