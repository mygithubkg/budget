import { adminDb } from "@/lib/firebase/admin";
import { callGroqWithFallback } from "@/lib/groqFallback";
import {
  chatApiResponseSchema,
  ChatApiResponse,
  ParsedExpenseData,
  OFF_TOPIC_RESPONSE,
} from "@/lib/validations";
import { findSimilarCategory } from "@/lib/category-utils";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import {
  ChatIntent,
  StatusQueryType,
  StatusQueryResult,
  StatusTransactionSummary,
  StatusFriendDebtSummary,
  ChatProcessResult,
} from "@/types";

export interface ProcessMessageOptions {
  categoryList?: string[];
  friendList?: string[];
  todayDate?: string;
  currency?: string;
}

/**
 * Transport-agnostic message processing core.
 * Handles intent classification, multi-expense extraction, status query resolution in Firestore,
 * and category matching for both Web and Telegram interfaces.
 */
export async function processIncomingMessage(
  uid: string,
  message: string,
  conversationHistory: { role: string; content: string }[] = [],
  options?: ProcessMessageOptions
): Promise<ChatProcessResult> {
  const todayDate =
    options?.todayDate || new Date().toISOString().split("T")[0];

  // 1. Resolve categories, friends, and currency if not explicitly supplied
  let categoryList = options?.categoryList;
  let friendList = options?.friendList;
  let currency = options?.currency || "INR";

  // 1. Fetch user metadata (currency, categories, friends) from Firestore if not provided
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.currency) currency = userData.currency;
    }

    if (!categoryList) {
      const catSnap = await adminDb
        .collection("users")
        .doc(uid)
        .collection("categories")
        .get();
      if (!catSnap.empty) {
        categoryList = catSnap.docs.map((d) => d.data().name || d.id);
      } else {
        categoryList = [...DEFAULT_CATEGORIES];
      }
    }

    if (!friendList) {
      const friendsSnap = await adminDb
        .collection("users")
        .doc(uid)
        .collection("friends")
        .get();
      friendList = friendsSnap.docs.map((d) => d.data().name || "");
    }
  } catch (dbErr) {
    console.warn("Could not load user metadata for processing message, using defaults:", dbErr);
    if (!categoryList) categoryList = [...DEFAULT_CATEGORIES];
    if (!friendList) friendList = [];
  }

  // 2. Classify intent and parse data via Groq or fallback
  let parsedApiResult: ChatApiResponse;
  let modelUsed: string | undefined;
  let rateLimitExhausted = false;

  if (!process.env.GROQ_API_KEY) {
    parsedApiResult = heuristicFallbackIntentRouter(
      message,
      categoryList,
      friendList,
      todayDate,
      conversationHistory
    );
    modelUsed = "heuristic-fallback";
  } else {
    const systemPrompt = `You are FinChat's financial intelligence assistant.
Your job is to parse messages into structured finance logs or answer status queries. Respond with ONLY valid JSON (no markdown ticks):

{
  "intent": "log_transaction" | "status_query" | "off_topic",
  "transactions": [
    {
      "type": "expense" | "income",
      "totalAmount": number,
      "userShare": number,
      "description": string,
      "category": string,
      "date": "YYYY-MM-DD",
      "splits": [
        { "friendName": string, "amount": number, "direction": "they_owe_me" | "i_owe_them" }
      ],
      "needsClarification": boolean,
      "clarificationQuestion": string | null
    }
  ] | null,
  "queryType": "balance" | "last_transactions" | "friend_debts" | "general_summary" | null
}

Existing categories: ${JSON.stringify(categoryList)}
Known friends: ${JSON.stringify(friendList)}
Today's date: "${todayDate}"

CRITICAL RULES:
1. MULTI-EXPENSE SPLITTING: If the user lists multiple distinct items or amounts in one message (e.g. "spent 500 on food, 300 on mattress and 100 on cake today"), you MUST output a separate transaction object for EVERY item in the "transactions" array. Do NOT merge them into one. Do NOT drop any item.
2. CATEGORY ASSIGNMENT: Assign each item its own best-fit category independently (e.g. Food -> "Food & Dining", Mattress -> "Shopping", Cake -> "Food & Dining").
3. SINGLE EXPENSES: Even if there is only 1 expense, "transactions" must be an array of length 1.
4. FRIEND DEBTS & SPLIT DIRECTION:
   - When a friend owes the user (e.g., "Spent 500 on dinner, Sam owes 250", "Sam owes me 500", "Lent 500 to Sam"):
     Set split "direction": "they_owe_me".
   - When the user owes a friend (e.g., "I owe 500 to Sam", "I owe my friend Rohit 300 for lunch", "Sam paid 500 for dinner for me", "Borrowed 500 from Sam"):
     Set split "direction": "i_owe_them". The transaction is an expense of that amount with userShare = totalAmount and split = [{ "friendName": "Sam", "amount": 500, "direction": "i_owe_them" }].
   - If the user says "Spent 250 on coffee with Sam" with no split amount, return 1 transaction with "needsClarification": true, "clarificationQuestion": "Did you split this ₹250 with Sam (e.g., does Sam owe you a share), or should I record the full ₹250 as your own complete expense?".
5. STATUS QUERIES: If asking for balance, last transactions, friend debts, or summary, set "transactions": null and "queryType" to the appropriate value.

FEW-SHOT EXAMPLES:
Input: "spent 500 on food, 300 on mattress and 100 on cake today"
Output:
{
  "intent": "log_transaction",
  "transactions": [
    { "type": "expense", "totalAmount": 500, "userShare": 500, "description": "Food", "category": "Food & Dining", "date": "${todayDate}", "splits": [], "needsClarification": false, "clarificationQuestion": null },
    { "type": "expense", "totalAmount": 300, "userShare": 300, "description": "Mattress", "category": "Shopping", "date": "${todayDate}", "splits": [], "needsClarification": false, "clarificationQuestion": null },
    { "type": "expense", "totalAmount": 100, "userShare": 100, "description": "Cake", "category": "Food & Dining", "date": "${todayDate}", "splits": [], "needsClarification": false, "clarificationQuestion": null }
  ],
  "queryType": null
}

Input: "I owe 500 to my friend Sam for dinner"
Output:
{
  "intent": "log_transaction",
  "transactions": [
    { "type": "expense", "totalAmount": 500, "userShare": 500, "description": "Dinner (Owe Sam)", "category": "Food & Dining", "date": "${todayDate}", "splits": [{ "friendName": "Sam", "amount": 500, "direction": "i_owe_them" }], "needsClarification": false, "clarificationQuestion": null }
  ],
  "queryType": null
}

Input: "Rohit owes me 300 for lunch"
Output:
{
  "intent": "log_transaction",
  "transactions": [
    { "type": "expense", "totalAmount": 300, "userShare": 0, "description": "Lunch (Rohit share)", "category": "Food & Dining", "date": "${todayDate}", "splits": [{ "friendName": "Rohit", "amount": 300, "direction": "they_owe_me" }], "needsClarification": false, "clarificationQuestion": null }
  ],
  "queryType": null
}

Input: "paid 1500 for electricity and 500 for wifi"
Output:
{
  "intent": "log_transaction",
  "transactions": [
    { "type": "expense", "totalAmount": 1500, "userShare": 1500, "description": "Electricity", "category": "Bills & Utilities", "date": "${todayDate}", "splits": [], "needsClarification": false, "clarificationQuestion": null },
    { "type": "expense", "totalAmount": 500, "userShare": 500, "description": "Wifi", "category": "Bills & Utilities", "date": "${todayDate}", "splits": [], "needsClarification": false, "clarificationQuestion": null }
  ],
  "queryType": null
}`;

    const groqMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (conversationHistory.length > 0) {
      conversationHistory.slice(-4).forEach((h) => {
        groqMessages.push({
          role: h.role === "assistant" ? "assistant" : "user",
          content: h.content,
        });
      });
    }

    groqMessages.push({ role: "user", content: message });

    let rawResponse = "";

    try {
      const fallbackResult = await callGroqWithFallback({
        messages: groqMessages,
        temperature: 0.1,
        responseFormat: { type: "json_object" },
      });
      rawResponse = fallbackResult.content;
      modelUsed = fallbackResult.modelUsed;

      const cleanJson = rawResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      const parsedJson = JSON.parse(cleanJson);
      const validated = chatApiResponseSchema.safeParse({ ...parsedJson, modelUsed });

      if (validated.success) {
        parsedApiResult = validated.data;
      } else {
        parsedApiResult = heuristicFallbackIntentRouter(
          message,
          categoryList,
          friendList,
          todayDate,
          conversationHistory
        );
      }
    } catch (groqErr: any) {
      console.error("Groq processing error, falling back to heuristic router:", groqErr);
      if (String(groqErr?.message).includes("ALL_MODELS_RATE_LIMITED")) {
        rateLimitExhausted = true;
      }
      parsedApiResult = heuristicFallbackIntentRouter(
        message,
        categoryList,
        friendList,
        todayDate,
        conversationHistory
      );
      modelUsed = "heuristic-fallback";
    }
  }

  // 3. Multi-expense heuristic safety check
  const numMatches = Array.from(
    message.matchAll(/(?:rs\.?|inr|₹|\$)?\s*(\d+(?:\.\d{1,2})?)/gi)
  );
  if (
    parsedApiResult.intent === "log_transaction" &&
    Array.isArray(parsedApiResult.transactions) &&
    parsedApiResult.transactions.length === 1 &&
    numMatches.length > 1 &&
    !message.toLowerCase().includes("mine") &&
    !message.toLowerCase().includes("split") &&
    !message.toLowerCase().includes("share")
  ) {
    const multiFallback = extractMultiExpenseItems(message, categoryList, todayDate);
    if (multiFallback.length > 1) {
      parsedApiResult.transactions = multiFallback;
    }
  }

  // 4. Normalize category names
  if (
    parsedApiResult.intent === "log_transaction" &&
    Array.isArray(parsedApiResult.transactions)
  ) {
    parsedApiResult.transactions.forEach((tx) => {
      if (!tx.needsClarification && tx.category) {
        const match = findSimilarCategory(tx.category, categoryList || []);
        tx.category = match.resolvedName;
      }
    });
  }

  // 5. Build response and resolve status queries if applicable
  const intent: ChatIntent = parsedApiResult.intent;

  if (rateLimitExhausted) {
    return {
      intent: "off_topic",
      transactions: null,
      queryType: null,
      statusData: null,
      replyText: "I'm getting a lot of requests right now — please try again in a minute.",
      modelUsed,
      rateLimitExhausted: true,
    };
  }

  if (intent === "off_topic") {
    return {
      intent: "off_topic",
      transactions: null,
      queryType: null,
      statusData: null,
      replyText: OFF_TOPIC_RESPONSE,
      modelUsed,
    };
  }

  if (intent === "status_query" && parsedApiResult.queryType) {
    const statusData = await resolveStatusQueryData(uid, parsedApiResult.queryType);
    const replyText = formatStatusQueryText(statusData, currency);

    return {
      intent: "status_query",
      transactions: null,
      queryType: parsedApiResult.queryType,
      statusData,
      replyText,
      modelUsed,
    };
  }

  // log_transaction intent
  const transactions = parsedApiResult.transactions || [];
  const needsClarification = transactions.some((t) => t.needsClarification);
  let replyText = "";

  if (needsClarification) {
    const q = transactions.find((t) => t.needsClarification)?.clarificationQuestion;
    replyText =
      q ||
      "Could you clarify if you split this expense with friends, or if it was entirely yours?";
  } else if (transactions.length === 1) {
    const item = transactions[0];
    replyText = `Understood: ${item.description} for ₹${item.totalAmount} (${item.category}).`;
    if (item.splits && item.splits.length > 0) {
      const splitText = item.splits
        .map((s) =>
          s.direction === "i_owe_them"
            ? `You owe ${s.friendName} ₹${s.amount}`
            : `${s.friendName} owes you ₹${s.amount}`
        )
        .join(", ");
      replyText += ` [${splitText}]`;
    }
  } else if (transactions.length > 1) {
    const total = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    replyText = `Understood: ${transactions.length} items totaling ₹${total}.`;
  } else {
    replyText = "I could not extract an expense from your message. Please try again.";
  }

  return {
    intent: "log_transaction",
    transactions,
    queryType: null,
    statusData: null,
    replyText,
    modelUsed,
  };
}

/**
 * Server-side Firestore Status Query Resolver
 */
async function resolveStatusQueryData(
  uid: string,
  queryType: StatusQueryType
): Promise<StatusQueryResult> {
  let totalIncome = 0;
  let totalExpense = 0;
  const recentTxList: StatusTransactionSummary[] = [];
  const outstandingFriends: StatusFriendDebtSummary[] = [];

  try {
    // 1. Fetch all user transactions to compute accurate all-time totals
    const txSnap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .orderBy("date", "desc")
      .get();

    txSnap.docs.forEach((docSnap, idx) => {
      const data = docSnap.data();
      const amt = Number(data.amount) || 0;
      const userShare = data.userShare !== undefined && data.userShare !== null ? Number(data.userShare) : amt;
      const type = data.type === "income" ? "income" : "expense";

      if (type === "income") {
        totalIncome += amt;
      } else {
        totalExpense += userShare;
      }

      if (idx < 5) {
        const dateVal = data.date?.toDate
          ? data.date.toDate()
          : new Date(data.date || Date.now());
        recentTxList.push({
          id: docSnap.id,
          description: data.description || "Transaction",
          category: data.category || "Miscellaneous",
          amount: amt,
          userShare,
          type,
          date: isNaN(dateVal.getTime()) ? String(data.date).slice(0, 10) : dateVal.toISOString().split("T")[0],
        });
      }
    });

    // 2. Fetch friends with balances
    const friendsSnap = await adminDb
      .collection("users")
      .doc(uid)
      .collection("friends")
      .get();

    friendsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const bal = Number(data.balance) || 0;
      if (bal !== 0) {
        outstandingFriends.push({
          friendId: docSnap.id,
          friendName: data.name || "Friend",
          balance: bal,
        });
      }
    });
  } catch (err) {
    console.error("Error resolving status query in Firestore:", err);
  }

  const currentBalance = totalIncome - totalExpense;

  if (queryType === "balance") {
    return {
      queryType: "balance",
      balance: currentBalance,
      totalIncome,
      totalExpense,
    };
  }

  if (queryType === "last_transactions") {
    return {
      queryType: "last_transactions",
      transactions: recentTxList,
    };
  }

  if (queryType === "friend_debts") {
    return {
      queryType: "friend_debts",
      friendDebts: outstandingFriends,
    };
  }

  // general_summary
  return {
    queryType: "general_summary",
    balance: currentBalance,
    totalIncome,
    totalExpense,
    transactions: recentTxList.slice(0, 3),
    friendDebts: outstandingFriends.slice(0, 2),
  };
}

function formatAmt(val: number, symbol: string): string {
  const isNeg = val < 0;
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${isNeg ? "-" : ""}${symbol}${formatted}`;
}

/**
 * Format Status Query Data into plain-text/HTML string
 */
function formatStatusQueryText(statusData: StatusQueryResult, currency: string = "INR"): string {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "₹";

  if (statusData.queryType === "balance") {
    const bal = statusData.balance ?? 0;
    return `💰 Your current net balance is ${formatAmt(bal, symbol)}. (Income: +${formatAmt(
      statusData.totalIncome ?? 0,
      symbol
    )}, Expense: -${formatAmt(statusData.totalExpense ?? 0, symbol)})`;
  }

  if (statusData.queryType === "last_transactions") {
    const txs = statusData.transactions || [];
    if (txs.length === 0) return "No ledger entries have been recorded yet.";
    let msg = `Showing your ${txs.length} most recent ledger entries:\n\n`;
    txs.forEach((t) => {
      const sign = t.type === "income" ? "+" : "-";
      msg += `${t.date} | ${sign}${symbol}${t.amount} | ${t.description} (${t.category})\n`;
    });
    return msg.trim();
  }

  if (statusData.queryType === "friend_debts") {
    const debts = statusData.friendDebts || [];
    if (debts.length === 0) {
      return "No outstanding balances with friends. All accounts are settled.";
    }
    let msg = `Current friend debts:\n\n`;
    debts.forEach((f) => {
      if (f.balance > 0) {
        msg += `✅ ${f.friendName} owes you ${symbol}${f.balance.toLocaleString("en-IN")}\n`;
      } else {
        msg += `🔴 You owe ${f.friendName} ${symbol}${Math.abs(f.balance).toLocaleString("en-IN")}\n`;
      }
    });
    return msg.trim();
  }

  // general_summary
  const bal = statusData.balance ?? 0;
  let summary = `📊 Ledger Overview:\n• Net Balance: ${symbol}${bal.toLocaleString("en-IN")}\n`;
  if (statusData.transactions && statusData.transactions.length > 0) {
    summary += `\nRecent Activity:\n`;
    statusData.transactions.forEach((t) => {
      summary += `• ${t.description}: ${symbol}${t.amount} (${t.category})\n`;
    });
  }
  if (statusData.friendDebts && statusData.friendDebts.length > 0) {
    summary += `\nOutstanding Friend Balances:\n`;
    statusData.friendDebts.forEach((f) => {
      const tag = f.balance > 0 ? `owes you ${symbol}${f.balance}` : `you owe ${symbol}${Math.abs(f.balance)}`;
      summary += `• ${f.friendName}: ${tag}\n`;
    });
  }
  return summary.trim();
}

/**
 * Multi-expense extraction regex parser
 */
export function extractMultiExpenseItems(
  message: string,
  categoryList: string[] = [],
  todayDate: string
): ParsedExpenseData[] {
  const rawClauses = message.split(/,|\band\b|;/gi);
  const items: ParsedExpenseData[] = [];

  for (const raw of rawClauses) {
    const clause = raw.trim();
    if (!clause) continue;

    const amtMatch = clause.match(/(?:rs\.?|inr|₹|\$)?\s*(\d+(?:\.\d{1,2})?)/i);
    if (!amtMatch) continue;

    const amt = parseFloat(amtMatch[1]);
    if (isNaN(amt) || amt <= 0) continue;

    let itemDesc = clause
      .replace(/(?:rs\.?|inr|₹|\$)?\s*\d+(?:\.\d{1,2})?/gi, "")
      .replace(/spent|paid|bought|for|on|today|yesterday/gi, "")
      .replace(/\bwith\s+\w+\b/gi, "")
      .trim();

    if (!itemDesc) itemDesc = "Expense";
    itemDesc = itemDesc.charAt(0).toUpperCase() + itemDesc.slice(1);

    const clauseLower = clause.toLowerCase();
    let itemCat = "Miscellaneous";
    if (
      /mattress|furniture|bed|pillow|table|chair|clothes|shopping|shoes|shirt|pant|phone|laptop|cable|amazon|flipkart/i.test(
        clauseLower
      )
    ) {
      itemCat = "Shopping";
    } else if (
      /cab|uber|ola|auto|petrol|fuel|train|flight|bus|metro|travel|ticket/i.test(clauseLower)
    ) {
      itemCat = "Transportation";
    } else if (
      /cake|coffee|tea|dinner|lunch|breakfast|pizza|burger|snack|food|groceries|restaurant|swiggy|zomato/i.test(
        clauseLower
      )
    ) {
      itemCat = "Food & Dining";
    } else if (/electricity|water|wifi|bill|rent|recharge|gas/i.test(clauseLower)) {
      itemCat = "Bills & Utilities";
    } else if (/salary|credited|freelance|bonus|received/i.test(clauseLower)) {
      itemCat = "Salary/Income";
    } else if (categoryList.length > 0) {
      itemCat = categoryList[0];
    }

    items.push({
      type: /salary|credited|received|deposit|income/i.test(clauseLower)
        ? "income"
        : "expense",
      totalAmount: amt,
      userShare: amt,
      description: itemDesc,
      category: itemCat,
      date: todayDate,
      splits: [],
      needsClarification: false,
      clarificationQuestion: null,
    });
  }

  return items;
}

function formatFallbackResponse(
  intent: "log_transaction" | "status_query" | "off_topic",
  queryType: "balance" | "last_transactions" | "friend_debts" | "general_summary" | null = null,
  transactions: ParsedExpenseData[] | null = null
): ChatApiResponse {
  return {
    intent,
    queryType,
    transactions,
    transaction: transactions && transactions.length > 0 ? transactions[0] : null,
    modelUsed: "heuristic-fallback",
  };
}

export function heuristicFallbackIntentRouter(
  message: string,
  categoryList: string[] = [],
  friendList: string[] = [],
  todayDate: string,
  conversationHistory: { role: string; content: string }[] = []
): ChatApiResponse {
  const lower = message.toLowerCase().trim();

  // Multi-turn clarification resolution
  const lastAssistantMsg = conversationHistory
    .slice()
    .reverse()
    .find((m) => m.role === "assistant")?.content;

  if (
    lastAssistantMsg &&
    (lastAssistantMsg.includes("Did you split this") ||
      lastAssistantMsg.includes("does") ||
      lastAssistantMsg.includes("clarification") ||
      lastAssistantMsg.includes("record the full"))
  ) {
    const prevAmtMatch = lastAssistantMsg.match(/[₹$]?\s*(\d+(?:\.\d{1,2})?)/);
    const prevFriendMatch = lastAssistantMsg.match(/with\s+([A-Za-z]+)/i);

    const amount = prevAmtMatch ? parseFloat(prevAmtMatch[1]) : 250;
    const friendName = prevFriendMatch ? prevFriendMatch[1] : "Friend";

    if (/(split|equal|50\/50|half|yes|split it)/i.test(lower)) {
      const half = Math.round((amount / 2) * 100) / 100;
      return formatFallbackResponse("log_transaction", null, [
        {
          type: "expense",
          totalAmount: amount,
          userShare: amount - half,
          description: `Coffee with ${friendName}`,
          category: "Food & Dining",
          date: todayDate,
          splits: [{ friendName, amount: half, direction: "they_owe_me" }],
          needsClarification: false,
          clarificationQuestion: null,
        },
      ]);
    }

    const friendAmtMatch = lower.match(/(?:owes|share|is)?\s*(\d+)/);
    if (friendAmtMatch && /(owes|share|part)/i.test(lower)) {
      const friendAmt = parseFloat(friendAmtMatch[1]);
      return formatFallbackResponse("log_transaction", null, [
        {
          type: "expense",
          totalAmount: amount,
          userShare: Math.max(0, amount - friendAmt),
          description: `Coffee with ${friendName}`,
          category: "Food & Dining",
          date: todayDate,
          splits: [{ friendName, amount: friendAmt, direction: "they_owe_me" }],
          needsClarification: false,
          clarificationQuestion: null,
        },
      ]);
    }

    if (/(all mine|complete|full|my expense|my treat|just me|me)/i.test(lower)) {
      return formatFallbackResponse("log_transaction", null, [
        {
          type: "expense",
          totalAmount: amount,
          userShare: amount,
          description: `Coffee with ${friendName}`,
          category: "Food & Dining",
          date: todayDate,
          splits: [],
          needsClarification: false,
          clarificationQuestion: null,
        },
      ]);
    }
  }

  // 1. Status query checks
  if (
    /(\bbalance\b|\bnet worth\b|\bhow much.*(?:have|left|money)\b|\bcurrent balance\b)/i.test(
      lower
    )
  ) {
    return formatFallbackResponse("status_query", "balance", null);
  }

  if (
    /(\brecent\b|\blast\s*\d*\s*(?:transaction|expense|log|spend)|\bhistory\b|\bwhat did i spend\b)/i.test(
      lower
    )
  ) {
    return formatFallbackResponse("status_query", "last_transactions", null);
  }

  if (
    /(\bwho owes\b|\bdebt\b|\bdebts\b|\bwho do i owe\b|\bowed\b|\bfriend balance\b)/i.test(
      lower
    )
  ) {
    return formatFallbackResponse("status_query", "friend_debts", null);
  }

  if (
    /(\bhow am i doing\b|\bfinancial summary\b|\bgive me an update\b|\boverview\b|\bstatus\b)/i.test(
      lower
    )
  ) {
    return formatFallbackResponse("status_query", "general_summary", null);
  }

  // 1.5 Explicit Friend Debt Detection (e.g. "I owe 500 to my friend Sam" vs "Sam owes me 250")
  const isUserOwes = /\b(i owe|owe to|borrowed|took|debt to|paid for me|covered for me)\b/i.test(
    lower
  );
  const isFriendOwes = /\b(owes me|lent to|gave to|lent|credit from)\b/i.test(lower);

  if (isUserOwes || isFriendOwes) {
    const allAmts = Array.from(
      message.matchAll(/(?:rs\.?|inr|₹|\$)?\s*(\d+(?:\.\d{1,2})?)/gi)
    );
    const debtAmount = allAmts[0] ? parseFloat(allAmts[0][1]) : 0;

    let detectedFriend = "";
    for (const f of friendList) {
      if (lower.includes(f.toLowerCase())) {
        detectedFriend = f;
        break;
      }
    }
    if (!detectedFriend) {
      const match =
        message.match(/(?:friend|to|from|with)\s+([A-Za-z]+)/i) ||
        message.match(/([A-Za-z]+)\s+(?:owes|paid)/i);
      if (
        match &&
        !["my", "the", "a", "an", "for", "on", "in", "at", "and", "me"].includes(
          match[1].toLowerCase()
        )
      ) {
        detectedFriend = match[1];
      }
    }

    if (debtAmount > 0) {
      const friendName = detectedFriend || "Friend";
      const direction = isUserOwes ? "i_owe_them" : "they_owe_me";
      const desc = isUserOwes ? `Owe ${friendName}` : `${friendName} owes`;

      return formatFallbackResponse("log_transaction", null, [
        {
          type: "expense",
          totalAmount: debtAmount,
          userShare: isUserOwes ? debtAmount : 0,
          description: desc,
          category: "Miscellaneous",
          date: todayDate,
          splits: [{ friendName, amount: debtAmount, direction }],
          needsClarification: false,
          clarificationQuestion: null,
        },
      ]);
    }
  }

  // 2. Transaction logging check with multi-expense parsing
  const isIncome = /(salary|received|credited|deposit|income|got|earned)/i.test(lower);
  const isExpenseKeyword =
    /(spent|paid|bought|expense|dinner|lunch|coffee|groceries|shopping|flight|cab|uber|ola|swiggy|zomato)/i.test(
      lower
    );
  const allAmounts = Array.from(
    message.matchAll(/(?:rs\.?|inr|₹|\$)?\s*(\d+(?:\.\d{1,2})?)/gi)
  );

  if (allAmounts.length > 0 || isExpenseKeyword || isIncome) {
    const multiItems = extractMultiExpenseItems(message, categoryList, todayDate);

    if (multiItems.length > 0) {
      return formatFallbackResponse("log_transaction", null, multiItems);
    }

    // Single item fallback
    const totalAmount = allAmounts[0] ? parseFloat(allAmounts[0][1]) : 0;
    return formatFallbackResponse("log_transaction", null, [
      {
        type: isIncome ? "income" : "expense",
        totalAmount,
        userShare: totalAmount,
        description:
          message.replace(/spent|paid|for|on|\d+|rupees|rs|₹/gi, "").trim() || "Expense",
        category: isIncome ? "Salary/Income" : "Food & Dining",
        date: todayDate,
        splits: [],
        needsClarification: false,
        clarificationQuestion: null,
      },
    ]);
  }

  // 3. Off-topic
  return formatFallbackResponse("off_topic", null, null);
}
