import { z } from "zod";

export const OFF_TOPIC_RESPONSE =
  "My goal is just to manage your expenses, income, and logs. We'll notify you if we add this feature in the future.";

export const splitSchema = z.object({
  friendName: z.string().min(1, "Friend name is required"),
  amount: z.number().positive("Split amount must be greater than 0"),
});

export const parsedExpenseSchema = z.object({
  type: z
    .enum(["expense", "income"])
    .nullish()
    .transform((v) => v || "expense"),
  totalAmount: z
    .number()
    .nullish()
    .transform((v) => (typeof v === "number" && !isNaN(v) ? Math.max(0, v) : 0)),
  userShare: z
    .number()
    .nullish()
    .transform((v) => (typeof v === "number" && !isNaN(v) ? Math.max(0, v) : 0)),
  description: z
    .string()
    .nullish()
    .transform((v) => v || ""),
  category: z
    .string()
    .nullish()
    .transform((v) => v || "Miscellaneous"),
  date: z
    .string()
    .nullish()
    .transform((v) =>
      v && /^\d{4}-\d{2}-\d{2}$/.test(v)
        ? v
        : new Date().toISOString().split("T")[0]
    ),
  splits: z
    .array(splitSchema)
    .nullish()
    .transform((v) => (Array.isArray(v) ? v : [])),
  needsClarification: z
    .boolean()
    .nullish()
    .transform((v) => Boolean(v)),
  clarificationQuestion: z
    .string()
    .nullish()
    .transform((v) => v || null),
});

export const parseExpenseRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  categoryList: z.array(z.string()).default([]),
  friendList: z.array(z.string()).default([]),
  todayDate: z.string().default(() => new Date().toISOString().split("T")[0]),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

// Chat Intent Router Schemas (Addendum)
export const chatIntentSchema = z
  .enum(["log_transaction", "status_query", "off_topic"])
  .nullish()
  .transform((v) => v || "log_transaction");

export const statusQueryTypeSchema = z
  .enum(["balance", "last_transactions", "friend_debts", "general_summary"])
  .nullish();

export const chatApiResponseSchema = z
  .object({
    intent: chatIntentSchema,
    transactions: z.array(parsedExpenseSchema).nullish(),
    transaction: parsedExpenseSchema.nullish(), // legacy single item support
    queryType: statusQueryTypeSchema.nullable().optional(),
    modelUsed: z.string().nullish(),
  })
  .transform((data) => {
    let finalTransactions: z.infer<typeof parsedExpenseSchema>[] | null = null;
    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      finalTransactions = data.transactions;
    } else if (data.transaction) {
      finalTransactions = [data.transaction];
    } else if (data.intent === "log_transaction") {
      finalTransactions = [];
    }

    return {
      intent: data.intent,
      transactions: finalTransactions,
      transaction: finalTransactions && finalTransactions.length > 0 ? finalTransactions[0] : null,
      queryType: data.queryType || null,
      modelUsed: data.modelUsed || null,
    };
  });

export const transactionInputSchema = z.object({
  groupId: z.string().optional(),
  type: z.enum(["expense", "income"]),
  amount: z.number().positive("Amount must be greater than 0"),
  userShare: z.number().nonnegative(),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  date: z.date(),
  rawInput: z.string().default(""),
  splits: z
    .array(
      z.object({
        friendId: z.string().optional(),
        friendName: z.string().min(1),
        amount: z.number().positive(),
      })
    )
    .optional(),
  source: z.enum(["chat", "manual"]).default("chat"),
});

export type ParsedExpenseData = z.infer<typeof parsedExpenseSchema>;
export type ParseExpenseRequest = z.infer<typeof parseExpenseRequestSchema>;
export type ChatApiResponse = z.infer<typeof chatApiResponseSchema>;
export type TransactionInput = z.infer<typeof transactionInputSchema>;
