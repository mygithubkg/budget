import { detectDuplicates } from "../duplicate-detector";
import { ImportPreviewItem } from "@/types";

describe("Duplicate Detection Engine", () => {
  const existingTransactions = [
    {
      id: "tx-1",
      amount: 450,
      type: "expense" as const,
      date: new Date("2026-08-04T12:00:00Z"),
      description: "Grocery store",
    },
    {
      id: "tx-2",
      amount: 50000,
      type: "income" as const,
      date: new Date("2026-08-01T09:00:00Z"),
      description: "Monthly Salary",
    },
  ];

  it("flags exact match (same date, same amount, same type) as duplicate and unchecks it", () => {
    const candidateItems: ImportPreviewItem[] = [
      {
        tempId: "c-1",
        date: "2026-08-04",
        description: "Supermarket Purchase",
        category: "Groceries",
        amount: 450,
        type: "expense",
        userShare: 450,
        isDuplicate: false,
        selected: true,
      },
    ];

    const result = detectDuplicates(candidateItems, existingTransactions, "INR");
    expect(result[0].isDuplicate).toBe(true);
    expect(result[0].selected).toBe(false);
    expect(result[0].duplicateReason).toContain("Matches existing expense of INR 450.00");
  });

  it("flags match within ±1 calendar day as duplicate", () => {
    const candidateItems: ImportPreviewItem[] = [
      {
        tempId: "c-2",
        date: "2026-08-05", // 1 day after Aug 4
        description: "Grocery mart",
        category: "Groceries",
        amount: 450,
        type: "expense",
        userShare: 450,
        isDuplicate: false,
        selected: true,
      },
      {
        tempId: "c-3",
        date: "2026-08-03", // 1 day before Aug 4
        description: "Grocery mart",
        category: "Groceries",
        amount: 450,
        type: "expense",
        userShare: 450,
        isDuplicate: false,
        selected: true,
      },
    ];

    const result = detectDuplicates(candidateItems, existingTransactions, "INR");
    expect(result[0].isDuplicate).toBe(true);
    expect(result[0].selected).toBe(false);
    expect(result[1].isDuplicate).toBe(true);
    expect(result[1].selected).toBe(false);
  });

  it("does not flag item if date difference is > 1 day", () => {
    const candidateItems: ImportPreviewItem[] = [
      {
        tempId: "c-4",
        date: "2026-08-07", // 3 days after Aug 4
        description: "Grocery store",
        category: "Groceries",
        amount: 450,
        type: "expense",
        userShare: 450,
        isDuplicate: false,
        selected: true,
      },
    ];

    const result = detectDuplicates(candidateItems, existingTransactions, "INR");
    expect(result[0].isDuplicate).toBe(false);
    expect(result[0].selected).toBe(true);
  });

  it("does not flag item if amount differs", () => {
    const candidateItems: ImportPreviewItem[] = [
      {
        tempId: "c-5",
        date: "2026-08-04",
        description: "Grocery store",
        category: "Groceries",
        amount: 550, // Different amount
        type: "expense",
        userShare: 550,
        isDuplicate: false,
        selected: true,
      },
    ];

    const result = detectDuplicates(candidateItems, existingTransactions, "INR");
    expect(result[0].isDuplicate).toBe(false);
    expect(result[0].selected).toBe(true);
  });

  it("does not flag item if type differs (income vs expense)", () => {
    const candidateItems: ImportPreviewItem[] = [
      {
        tempId: "c-6",
        date: "2026-08-04",
        description: "Refund",
        category: "General",
        amount: 450,
        type: "income", // Different type
        userShare: 450,
        isDuplicate: false,
        selected: true,
      },
    ];

    const result = detectDuplicates(candidateItems, existingTransactions, "INR");
    expect(result[0].isDuplicate).toBe(false);
    expect(result[0].selected).toBe(true);
  });
});
