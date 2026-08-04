import {
  formatTelegramExpenseMessage,
  getConfirmationKeyboard,
  formatTelegramStatusQuery,
  escapeHtml,
} from "../lib/telegram/bot";
import {
  extractMultiExpenseItems,
  heuristicFallbackIntentRouter,
} from "../lib/chat/processMessage";
import { ParsedExpenseData } from "../lib/validations";
import { StatusQueryResult } from "../types";

describe("Telegram Bot Helpers & Formatters", () => {
  describe("escapeHtml", () => {
    it("escapes special HTML characters properly", () => {
      expect(escapeHtml("Tom & Jerry <3")).toBe("Tom &amp; Jerry &lt;3");
      expect(escapeHtml("Normal text")).toBe("Normal text");
    });
  });

  describe("formatTelegramExpenseMessage", () => {
    it("formats single expense into HTML <pre> block", () => {
      const items: ParsedExpenseData[] = [
        {
          type: "expense",
          totalAmount: 500,
          userShare: 500,
          description: "Dinner",
          category: "Food & Dining",
          date: "2026-08-04",
          splits: [],
          needsClarification: false,
          clarificationQuestion: null,
        },
      ];

      const html = formatTelegramExpenseMessage(items, "INR");
      expect(html).toContain("<b>📒 Logged from your message:</b>");
      expect(html).toContain("<pre>");
      expect(html).toContain("₹500");
      expect(html).toContain("Dinner (Food & Dining)");
      expect(html).toContain("Total");
      expect(html).toContain("</pre>");
    });

    it("formats multi-expense items with accurate sum and category breakdown", () => {
      const items: ParsedExpenseData[] = [
        {
          type: "expense",
          totalAmount: 500,
          userShare: 500,
          description: "Food",
          category: "Food & Dining",
          date: "2026-08-04",
          splits: [],
          needsClarification: false,
          clarificationQuestion: null,
        },
        {
          type: "expense",
          totalAmount: 300,
          userShare: 300,
          description: "Mattress",
          category: "Shopping",
          date: "2026-08-04",
          splits: [],
          needsClarification: false,
          clarificationQuestion: null,
        },
        {
          type: "expense",
          totalAmount: 100,
          userShare: 100,
          description: "Cake",
          category: "Food & Dining",
          date: "2026-08-04",
          splits: [],
          needsClarification: false,
          clarificationQuestion: null,
        },
      ];

      const html = formatTelegramExpenseMessage(items, "INR");
      expect(html).toContain("₹500");
      expect(html).toContain("₹300");
      expect(html).toContain("₹100");
      expect(html).toContain("₹900");
      expect(html).toContain("Total");
    });

    it("formats friend splits with direction tags", () => {
      const items: ParsedExpenseData[] = [
        {
          type: "expense",
          totalAmount: 600,
          userShare: 300,
          description: "Lunch with Sam",
          category: "Food & Dining",
          date: "2026-08-04",
          splits: [
            {
              friendName: "Sam",
              amount: 300,
              direction: "they_owe_me",
            },
          ],
          needsClarification: false,
          clarificationQuestion: null,
        },
      ];

      const html = formatTelegramExpenseMessage(items, "INR");
      expect(html).toContain("Sam owes: ₹300");
    });
  });

  describe("getConfirmationKeyboard", () => {
    it("builds confirm and cancel inline keyboard callbacks", () => {
      const kb = getConfirmationKeyboard("sess_123");
      expect(kb.inline_keyboard).toHaveLength(1);
      expect(kb.inline_keyboard[0]).toEqual([
        { text: "✅ Confirm", callback_data: "confirm:sess_123" },
        { text: "❌ Cancel", callback_data: "cancel:sess_123" },
      ]);
    });
  });

  describe("formatTelegramStatusQuery", () => {
    it("formats balance query", () => {
      const status: StatusQueryResult = {
        queryType: "balance",
        balance: 14500,
        totalIncome: 20000,
        totalExpense: 5500,
      };

      const text = formatTelegramStatusQuery(status, "INR");
      expect(text).toContain("Current Ledger Net Balance:");
      expect(text).toContain("₹14,500");
      expect(text).toContain("Total Income:");
      expect(text).toContain("₹20,000");
    });

    it("formats friend debts with positive (they owe) and negative (i owe) indicators", () => {
      const status: StatusQueryResult = {
        queryType: "friend_debts",
        friendDebts: [
          { friendId: "1", friendName: "Rohit", balance: 500 },
          { friendId: "2", friendName: "Aarav", balance: -300 },
        ],
      };

      const text = formatTelegramStatusQuery(status, "INR");
      expect(text).toContain("✅ <b>Rohit</b> owes you <code>₹500</code>");
      expect(text).toContain("🔴 You owe <b>Aarav</b> <code>₹300</code>");
    });

    it("formats recent transactions as ledger <pre> table", () => {
      const status: StatusQueryResult = {
        queryType: "last_transactions",
        transactions: [
          {
            id: "tx1",
            description: "Grocery",
            category: "Food & Dining",
            amount: 450,
            userShare: 450,
            type: "expense",
            date: "2026-08-04",
          },
        ],
      };

      const text = formatTelegramStatusQuery(status, "INR");
      expect(text).toContain("<pre>");
      expect(text).toContain("-₹450");
      expect(text).toContain("Grocery");
      expect(text).toContain("</pre>");
    });
  });
});

describe("Core Processing Engine (processMessage)", () => {
  const categories = [
    "Food & Dining",
    "Shopping",
    "Transportation",
    "Bills & Utilities",
    "Salary/Income",
    "Miscellaneous",
  ];

  describe("extractMultiExpenseItems", () => {
    it("correctly breaks down compound messages into distinct items", () => {
      const msg = "spent 500 on food, 300 on mattress and 100 on cake today";
      const items = extractMultiExpenseItems(msg, categories, "2026-08-04");

      expect(items).toHaveLength(3);
      expect(items[0].totalAmount).toBe(500);
      expect(items[0].description).toBe("Food");
      expect(items[0].category).toBe("Food & Dining");

      expect(items[1].totalAmount).toBe(300);
      expect(items[1].description).toBe("Mattress");
      expect(items[1].category).toBe("Shopping");

      expect(items[2].totalAmount).toBe(100);
      expect(items[2].description).toBe("Cake");
      expect(items[2].category).toBe("Food & Dining");
    });
  });

  describe("heuristicFallbackIntentRouter", () => {
    it("routes balance status queries", () => {
      const res = heuristicFallbackIntentRouter(
        "what is my current balance?",
        categories,
        [],
        "2026-08-04"
      );
      expect(res.intent).toBe("status_query");
      expect(res.queryType).toBe("balance");
    });

    it("routes friend debt status queries", () => {
      const res = heuristicFallbackIntentRouter(
        "who owes me money?",
        categories,
        [],
        "2026-08-04"
      );
      expect(res.intent).toBe("status_query");
      expect(res.queryType).toBe("friend_debts");
    });

    it("correctly sets direction to i_owe_them when user owes friend", () => {
      const res = heuristicFallbackIntentRouter(
        "I owe 500 to my friend Sam for dinner",
        categories,
        ["Sam"],
        "2026-08-04"
      );
      expect(res.intent).toBe("log_transaction");
      expect(res.transactions).toHaveLength(1);
      expect(res.transactions![0].splits[0].friendName).toBe("Sam");
      expect(res.transactions![0].splits[0].direction).toBe("i_owe_them");
      expect(res.transactions![0].splits[0].amount).toBe(500);
    });

    it("correctly sets direction to they_owe_me when friend owes user", () => {
      const res = heuristicFallbackIntentRouter(
        "Rohit owes me 300 for lunch",
        categories,
        ["Rohit"],
        "2026-08-04"
      );
      expect(res.intent).toBe("log_transaction");
      expect(res.transactions).toHaveLength(1);
      expect(res.transactions![0].splits[0].friendName).toBe("Rohit");
      expect(res.transactions![0].splits[0].direction).toBe("they_owe_me");
      expect(res.transactions![0].splits[0].amount).toBe(300);
    });

    it("routes off-topic queries", () => {
      const res = heuristicFallbackIntentRouter(
        "Write a poem about the sunrise",
        categories,
        [],
        "2026-08-04"
      );
      expect(res.intent).toBe("off_topic");
    });
  });
});
