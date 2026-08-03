import {
  parsedExpenseSchema,
  parseExpenseRequestSchema,
  chatApiResponseSchema,
  transactionInputSchema,
  OFF_TOPIC_RESPONSE,
} from "../lib/validations";

describe("Validation Schemas, Multi-Expense Breakdown & Intent Router", () => {
  it("should validate a valid chat request body with conversation history", () => {
    const validRequest = {
      message: "Spent 500 on food, 300 on mattress and 100 on cake today",
      categoryList: ["Food & Dining", "Shopping"],
      friendList: ["Sam", "Rahul"],
      todayDate: "2026-08-03",
      conversationHistory: [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Ready when you are!" },
      ],
    };

    const result = parseExpenseRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("should validate multi-expense breakdown with itemized transactions array", () => {
    const multiExpenseResponse = {
      intent: "log_transaction" as const,
      transactions: [
        {
          type: "expense" as const,
          totalAmount: 500,
          userShare: 500,
          description: "Food",
          category: "Food & Dining",
          date: "2026-08-03",
          splits: [],
          needsClarification: false,
          clarificationQuestion: null,
        },
        {
          type: "expense" as const,
          totalAmount: 300,
          userShare: 300,
          description: "Mattress",
          category: "Shopping",
          date: "2026-08-03",
          splits: [],
          needsClarification: false,
          clarificationQuestion: null,
        },
        {
          type: "expense" as const,
          totalAmount: 100,
          userShare: 100,
          description: "Cake",
          category: "Food & Dining",
          date: "2026-08-03",
          splits: [],
          needsClarification: false,
          clarificationQuestion: null,
        },
      ],
      queryType: null,
      modelUsed: "openai/gpt-oss-120b",
    };

    const result = chatApiResponseSchema.safeParse(multiExpenseResponse);
    expect(result.success).toBe(true);
    expect(result.data?.transactions).toHaveLength(3);
    expect(result.data?.transactions?.[0].description).toBe("Food");
    expect(result.data?.transactions?.[1].description).toBe("Mattress");
    expect(result.data?.transactions?.[2].description).toBe("Cake");
    expect(result.data?.modelUsed).toBe("openai/gpt-oss-120b");
  });

  it("should automatically transform legacy single transaction object into transactions array", () => {
    const legacyResponse = {
      intent: "log_transaction" as const,
      transaction: {
        type: "expense" as const,
        totalAmount: 500,
        userShare: 250,
        description: "Pizza dinner",
        category: "Food & Dining",
        date: "2026-08-03",
        splits: [{ friendName: "Rahul", amount: 250 }],
        needsClarification: false,
        clarificationQuestion: null,
      },
      queryType: null,
    };

    const result = chatApiResponseSchema.safeParse(legacyResponse);
    expect(result.success).toBe(true);
    expect(result.data?.transactions).toHaveLength(1);
    expect(result.data?.transactions?.[0].totalAmount).toBe(500);
    expect(result.data?.transactions?.[0].splits).toHaveLength(1);
  });

  it("should validate clarification required when friend split is ambiguous", () => {
    const clarificationResponse = {
      intent: "log_transaction" as const,
      transactions: [
        {
          type: "expense" as const,
          totalAmount: 250,
          userShare: 250,
          description: "Coffee with Sam",
          category: "Food & Dining",
          date: "2026-08-03",
          splits: [],
          needsClarification: true,
          clarificationQuestion:
            "Did you split this ₹250 with Sam (e.g., does Sam owe you a share), or should I record the full ₹250 as your own complete expense?",
        },
      ],
      queryType: null,
    };

    const result = chatApiResponseSchema.safeParse(clarificationResponse);
    expect(result.success).toBe(true);
    expect(result.data?.transactions?.[0].needsClarification).toBe(true);
    expect(result.data?.transactions?.[0].clarificationQuestion).toContain("Sam");
  });

  it("should validate transactionInputSchema with groupId", () => {
    const txInput = {
      groupId: "batch-uuid-12345",
      type: "expense" as const,
      amount: 300,
      userShare: 300,
      description: "Mattress",
      category: "Shopping",
      date: new Date(),
      rawInput: "300 on mattress",
      source: "chat" as const,
    };

    const result = transactionInputSchema.safeParse(txInput);
    expect(result.success).toBe(true);
    expect(result.data?.groupId).toBe("batch-uuid-12345");
  });

  it("should validate status_query responses for all query types", () => {
    const queryTypes = [
      "balance",
      "last_transactions",
      "friend_debts",
      "general_summary",
    ] as const;

    for (const qt of queryTypes) {
      const statusResponse = {
        intent: "status_query" as const,
        queryType: qt,
        transactions: null,
      };
      const result = chatApiResponseSchema.safeParse(statusResponse);
      expect(result.success).toBe(true);
    }
  });

  it("should validate off_topic response and match exact canned response wording", () => {
    const offTopicResponse = {
      intent: "off_topic" as const,
      queryType: null,
      transactions: null,
    };

    const result = chatApiResponseSchema.safeParse(offTopicResponse);
    expect(result.success).toBe(true);

    expect(OFF_TOPIC_RESPONSE).toBe(
      "My goal is just to manage your expenses, income, and logs. We'll notify you if we add this feature in the future."
    );
  });
});
