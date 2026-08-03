import { NextRequest, NextResponse } from "next/server";
import { callGroqWithFallback } from "@/lib/groqFallback";
import {
  parseExpenseRequestSchema,
  chatApiResponseSchema,
  ChatApiResponse,
  ParsedExpenseData,
} from "@/lib/validations";
import { findSimilarCategory } from "@/lib/category-utils";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authorization header if present
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        userId = decoded.uid;
      } catch (authErr) {
        console.warn("Token verification skipped or failed in development:", authErr);
      }
    }

    // 2. Validate request body
    const body = await req.json();
    const parsedBody = parseExpenseRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsedBody.error.format() },
        { status: 400 }
      );
    }

    const { message, categoryList, friendList, todayDate, conversationHistory = [] } =
      parsedBody.data;

    // Check if Groq API key is present
    if (!process.env.GROQ_API_KEY) {
      console.warn("GROQ_API_KEY not configured. Using local intelligent multi-expense router.");
      const mockResult = heuristicFallbackIntentRouter(
        message,
        categoryList,
        friendList,
        todayDate,
        conversationHistory
      );
      return NextResponse.json(mockResult);
    }

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
        { "friendName": string, "amount": number }
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
4. FRIEND SPLITS: If the user says "spent 200 on dinner, 100 mine 100 Sam's", this is 1 transaction with a split. But if the user says "Spent 250 on coffee with Sam" with no split amount, return 1 transaction with "needsClarification": true, "clarificationQuestion": "Did you split this ₹250 with Sam (e.g., does Sam owe you a share), or should I record the full ₹250 as your own complete expense?".
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
    let modelUsed = "";

    try {
      const fallbackResult = await callGroqWithFallback({
        messages: groqMessages,
        temperature: 0.1,
        responseFormat: { type: "json_object" },
      });
      rawResponse = fallbackResult.content;
      modelUsed = fallbackResult.modelUsed;
    } catch (fallbackErr: any) {
      console.error("Groq fallback chain exhausted:", fallbackErr);

      if (String(fallbackErr?.message).includes("ALL_MODELS_RATE_LIMITED")) {
        return NextResponse.json({
          intent: "off_topic",
          transactions: null,
          queryType: null,
          rateLimitExhausted: true,
          message: "I'm getting a lot of requests right now — please try again in a minute.",
        });
      }

      // Local heuristic fallback if network issues
      const mockResult = heuristicFallbackIntentRouter(
        message,
        categoryList,
        friendList,
        todayDate,
        conversationHistory
      );
      return NextResponse.json(mockResult);
    }

    // Parse JSON safely
    let parsedJson: any = null;
    try {
      const cleanJson = rawResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      parsedJson = JSON.parse(cleanJson);
    } catch (jsonErr) {
      console.warn("Groq JSON parse failed, falling back to heuristic:", rawResponse);
      const fallback = heuristicFallbackIntentRouter(
        message,
        categoryList,
        friendList,
        todayDate,
        conversationHistory
      );
      return NextResponse.json(fallback);
    }

    // Validate with resilient Zod schema
    const validated = chatApiResponseSchema.safeParse({ ...parsedJson, modelUsed });
    if (!validated.success) {
      console.warn("Groq response validation soft failure, using fallback:", validated.error.format());
      const fallback = heuristicFallbackIntentRouter(
        message,
        categoryList,
        friendList,
        todayDate,
        conversationHistory
      );
      return NextResponse.json(fallback);
    }

    let data = validated.data;

    // Safety multi-expense checker:
    // If user message clearly has multiple distinct numbers (e.g. 500, 300, 100) and the model only returned 1 item,
    // supplement with heuristic multi-clause extraction so all items are captured.
    const numMatches = [...message.matchAll(/(?:rs\.?|inr|₹|\$)?\s*(\d+(?:\.\d{1,2})?)/gi)];
    if (
      data.intent === "log_transaction" &&
      Array.isArray(data.transactions) &&
      data.transactions.length === 1 &&
      numMatches.length > 1 &&
      !message.toLowerCase().includes("mine") &&
      !message.toLowerCase().includes("split") &&
      !message.toLowerCase().includes("share")
    ) {
      const multiFallback = extractMultiExpenseItems(message, categoryList, todayDate);
      if (multiFallback.length > 1) {
        data.transactions = multiFallback;
      }
    }

    // Apply category similarity normalization across all parsed transactions
    if (data.intent === "log_transaction" && Array.isArray(data.transactions)) {
      data.transactions.forEach((tx) => {
        if (!tx.needsClarification && tx.category) {
          const match = findSimilarCategory(tx.category, categoryList);
          tx.category = match.resolvedName;
        }
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Robust multi-expense parser for clauses like "spent 500 on food , 300 on mattress and 100 on cake today"
 */
function extractMultiExpenseItems(
  message: string,
  categoryList: string[],
  todayDate: string
): ParsedExpenseData[] {
  // Split on commas, "and", or semicolons
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

    // Best-fit category detection
    const clauseLower = clause.toLowerCase();
    let itemCat = "Miscellaneous";
    if (/mattress|furniture|bed|pillow|table|chair|clothes|shopping|shoes|shirt|pant|phone|laptop|cable|amazon|flipkart/i.test(clauseLower)) {
      itemCat = "Shopping";
    } else if (/cab|uber|ola|auto|petrol|fuel|train|flight|bus|metro|travel|ticket/i.test(clauseLower)) {
      itemCat = "Transportation";
    } else if (/cake|coffee|tea|dinner|lunch|breakfast|pizza|burger|snack|food|groceries|restaurant|swiggy|zomato/i.test(clauseLower)) {
      itemCat = "Food & Dining";
    } else if (/electricity|water|wifi|bill|rent|recharge|gas/i.test(clauseLower)) {
      itemCat = "Bills & Utilities";
    } else if (/salary|credited|freelance|bonus|received/i.test(clauseLower)) {
      itemCat = "Salary/Income";
    } else if (categoryList.length > 0) {
      itemCat = categoryList[0];
    }

    items.push({
      type: /salary|credited|received|deposit|income/i.test(clauseLower) ? "income" : "expense",
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

/**
 * Heuristic fallback router with multi-expense parsing and clarification support
 */
function heuristicFallbackIntentRouter(
  message: string,
  categoryList: string[],
  friendList: string[],
  todayDate: string,
  conversationHistory: { role: string; content: string }[] = []
): ChatApiResponse {
  const lower = message.toLowerCase().trim();

  // Multi-turn clarification resolution
  const lastAssistantMsg = [...conversationHistory]
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
      return {
        intent: "log_transaction",
        queryType: null,
        transactions: [
          {
            type: "expense",
            totalAmount: amount,
            userShare: amount - half,
            description: `Coffee with ${friendName}`,
            category: "Food & Dining",
            date: todayDate,
            splits: [{ friendName, amount: half }],
            needsClarification: false,
            clarificationQuestion: null,
          },
        ],
      };
    }

    const friendAmtMatch = lower.match(/(?:owes|share|is)?\s*(\d+)/);
    if (friendAmtMatch && /(owes|share|part)/i.test(lower)) {
      const friendAmt = parseFloat(friendAmtMatch[1]);
      return {
        intent: "log_transaction",
        queryType: null,
        transactions: [
          {
            type: "expense",
            totalAmount: amount,
            userShare: Math.max(0, amount - friendAmt),
            description: `Coffee with ${friendName}`,
            category: "Food & Dining",
            date: todayDate,
            splits: [{ friendName, amount: friendAmt }],
            needsClarification: false,
            clarificationQuestion: null,
          },
        ],
      };
    }

    if (/(all mine|complete|full|my expense|my treat|just me|me)/i.test(lower)) {
      return {
        intent: "log_transaction",
        queryType: null,
        transactions: [
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
        ],
      };
    }
  }

  // 1. Status query checks
  if (/(\bbalance\b|\bnet worth\b|\bhow much.*(?:have|left|money)\b|\bcurrent balance\b)/i.test(lower)) {
    return { intent: "status_query", queryType: "balance", transactions: null };
  }

  if (/(\brecent\b|\blast\s*\d*\s*(?:transaction|expense|log|spend)|\bhistory\b|\bwhat did i spend\b)/i.test(lower)) {
    return { intent: "status_query", queryType: "last_transactions", transactions: null };
  }

  if (/(\bwho owes\b|\bdebt\b|\bdebts\b|\bwho do i owe\b|\bowed\b|\bfriend balance\b)/i.test(lower)) {
    return { intent: "status_query", queryType: "friend_debts", transactions: null };
  }

  if (/(\bhow am i doing\b|\bfinancial summary\b|\bgive me an update\b|\boverview\b|\bstatus\b)/i.test(lower)) {
    return { intent: "status_query", queryType: "general_summary", transactions: null };
  }

  // 2. Transaction logging check with multi-expense parsing
  const isIncome = /(salary|received|credited|deposit|income|got|earned)/i.test(lower);
  const isExpenseKeyword = /(spent|paid|bought|expense|dinner|lunch|coffee|groceries|shopping|flight|cab|uber|ola|swiggy|zomato)/i.test(lower);
  const allAmounts = [...message.matchAll(/(?:rs\.?|inr|₹|\$)?\s*(\d+(?:\.\d{1,2})?)/gi)];

  if (allAmounts.length > 0 || isExpenseKeyword || isIncome) {
    const multiItems = extractMultiExpenseItems(message, categoryList, todayDate);

    if (multiItems.length > 0) {
      return {
        intent: "log_transaction",
        queryType: null,
        transactions: multiItems,
      };
    }

    // Single item fallback
    const totalAmount = allAmounts[0] ? parseFloat(allAmounts[0][1]) : 0;
    return {
      intent: "log_transaction",
      queryType: null,
      transactions: [
        {
          type: isIncome ? "income" : "expense",
          totalAmount,
          userShare: totalAmount,
          description: message.replace(/spent|paid|for|on|\d+|rupees|rs|₹/gi, "").trim() || "Expense",
          category: isIncome ? "Salary/Income" : "Food & Dining",
          date: todayDate,
          splits: [],
          needsClarification: false,
          clarificationQuestion: null,
        },
      ],
    };
  }

  // 3. Off-topic
  return {
    intent: "off_topic",
    queryType: null,
    transactions: null,
  };
}
