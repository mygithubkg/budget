import { getPeriodDateRange, computeSpendingStats, classifyTxNature } from "@/lib/analysis/stats";
import { validateAndEnforceCurrency } from "@/lib/analysis/narrative";
import { format } from "date-fns";

// Mock Firebase Admin
jest.mock("@/lib/firebase/admin", () => {
  const mockDocs: any[] = [];
  const mockGet = jest.fn().mockImplementation(() => {
    return Promise.resolve({
      size: mockDocs.length,
      forEach: (callback: any) => {
        mockDocs.forEach((d) =>
          callback({
            id: d.id,
            data: () => d,
          })
        );
      },
    });
  });

  const mockDoc = jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ currency: "INR" }),
    }),
  });

  const mockCollection = jest.fn().mockImplementation(() => {
    return {
      get: mockGet,
      doc: mockDoc,
    };
  });

  return {
    adminDb: {
      collection: mockCollection,
    },
    __setMockDocs: (docs: any[]) => {
      mockDocs.length = 0;
      mockDocs.push(...docs);
    },
  };
});

describe("Deterministic Spending Analysis Engine & Accuracy Overhaul", () => {
  const { __setMockDocs } = jest.requireMock("@/lib/firebase/admin");

  describe("classifyTxNature", () => {
    it("correctly flags transfers, investments, emergency fund, and savings", () => {
      expect(classifyTxNature({ type: "expense", category: "Savings", description: "Emergency fund", amount: 5000, date: new Date() })).toBe("transfer");
      expect(classifyTxNature({ type: "expense", category: "General", description: "Moved to Fixed Deposit", amount: 10000, date: new Date() })).toBe("transfer");
      expect(classifyTxNature({ type: "expense", category: "General", description: "Paid bank minimum balance", amount: 3000, date: new Date() })).toBe("transfer");
      expect(classifyTxNature({ type: "expense", category: "Investments", description: "SIP Mutual Fund", amount: 2500, date: new Date() })).toBe("transfer");
      expect(classifyTxNature({ type: "expense", category: "Food & Dining", description: "Dinner with friends", amount: 1200, date: new Date() })).toBe("spend");
      expect(classifyTxNature({ type: "income", category: "Salary", description: "Monthly salary", amount: 60000, date: new Date() })).toBe("income");
      expect(classifyTxNature({ type: "expense", nature: "transfer", category: "Custom", description: "Custom transfer", amount: 500, date: new Date() })).toBe("transfer");
    });
  });

  describe("getPeriodDateRange", () => {
    const fixedDate = new Date(2026, 7, 15); // Aug 15, 2026

    it("calculates correct 7-day week boundaries", () => {
      const { periodStart, periodEnd, priorStart, priorEnd } = getPeriodDateRange("week", fixedDate);
      expect(format(periodEnd, "yyyy-MM-dd")).toBe("2026-08-15");
      expect(format(periodStart, "yyyy-MM-dd")).toBe("2026-08-09");
      expect(format(priorEnd, "yyyy-MM-dd")).toBe("2026-08-08");
      expect(format(priorStart, "yyyy-MM-dd")).toBe("2026-08-02");
    });

    it("calculates correct month boundaries and prior month", () => {
      const { periodStart, periodEnd, priorStart, priorEnd } = getPeriodDateRange("month", fixedDate);
      expect(format(periodStart, "yyyy-MM-dd")).toBe("2026-08-01");
      expect(format(periodEnd, "yyyy-MM-dd")).toBe("2026-08-31");
      expect(format(priorStart, "yyyy-MM-dd")).toBe("2026-07-01");
      expect(format(priorEnd, "yyyy-MM-dd")).toBe("2026-07-31");
    });

    it("calculates correct 90-day (3 months) boundaries", () => {
      const { periodStart, periodEnd } = getPeriodDateRange("3months", fixedDate);
      expect(format(periodEnd, "yyyy-MM-dd")).toBe("2026-08-15");
      expect(format(periodStart, "yyyy-MM-dd")).toBe("2026-05-15");
    });
  });

  describe("computeSpendingStats", () => {
    const refDate = new Date(2026, 7, 10, 12, 0, 0); // Aug 10, 2026 (day 10 of August)

    beforeEach(() => {
      // Setup mock transactions in August 2026, July 2026, and trailing 90 days
      __setMockDocs([
        // Current month (Aug 2026)
        {
          id: "tx-1",
          type: "expense",
          amount: 5000,
          category: "Groceries",
          description: "Supermarket shopping",
          date: new Date(2026, 7, 2),
        },
        {
          id: "tx-2",
          type: "expense",
          amount: 2500,
          category: "Dining Out",
          description: "Dinner with friends",
          date: new Date(2026, 7, 5),
        },
        {
          id: "tx-3",
          type: "expense",
          amount: 12000,
          category: "Electronics",
          description: "New Monitor",
          date: new Date(2026, 7, 8),
        },
        {
          id: "tx-transfer-1",
          type: "expense",
          nature: "transfer",
          amount: 5000,
          category: "Savings",
          description: "Moved to savings",
          date: new Date(2026, 7, 6),
        },
        {
          id: "tx-4",
          type: "income",
          amount: 50000,
          category: "Salary",
          description: "Monthly salary",
          date: new Date(2026, 7, 1),
        },
        // Prior month (July 2026)
        {
          id: "tx-5",
          type: "expense",
          amount: 4000,
          category: "Groceries",
          description: "July Groceries",
          date: new Date(2026, 6, 15),
        },
        {
          id: "tx-6",
          type: "expense",
          amount: 1000,
          category: "Dining Out",
          description: "July Dining",
          date: new Date(2026, 6, 20),
        },
        // Recurring electricity bills in prior months to test unposted recurring bills detector
        {
          id: "tx-rec-1",
          type: "expense",
          nature: "spend",
          amount: 1500,
          category: "Bills & Utilities",
          description: "Electricity Bill",
          date: new Date(2026, 5, 20), // June 20
        },
        {
          id: "tx-rec-2",
          type: "expense",
          nature: "spend",
          amount: 1550,
          category: "Bills & Utilities",
          description: "Electricity Bill",
          date: new Date(2026, 6, 20), // July 20
        },
      ]);
    });

    it("correctly computes deterministic expense, income, and excludes transfers from spend", async () => {
      const stats = await computeSpendingStats("user-123", "month", refDate);

      // Total expense excludes tx-transfer-1 (5000)
      expect(stats.totalExpense).toBe(19500); // 5000 + 2500 + 12000
      expect(stats.transfersTotal).toBe(5000);
      expect(stats.totalIncome).toBe(50000);
      expect(stats.savingsRate).toBe(0.61); // (50000 - 19500) / 50000 = 0.61
      expect(stats.daysElapsed).toBe(10);
      expect(stats.daysRemaining).toBe(21);
      expect(stats.daysInPeriod).toBe(31);

      // Preformatted strings have correct currency symbols
      expect(stats.totalExpenseFormatted).toContain("19,500");
      expect(stats.transfersTotalFormatted).toContain("5,000");
      expect(stats.totalIncomeFormatted).toContain("50,000");
    });

    it("detects unposted recurring items and incorporates them into month-end projection", async () => {
      const stats = await computeSpendingStats("user-123", "month", refDate);

      expect(stats.expectedRecurringItems.length).toBe(1);
      expect(stats.expectedRecurringItems[0].description).toBe("Electricity Bill");
      expect(stats.recurringNotYetOccurredTotal).toBeGreaterThan(1400);
      expect(stats.projectedMonthEndExpense).toBe(stats.paceProjection + stats.recurringNotYetOccurredTotal);
    });

    it("enforces 3+ instance confidence threshold on day-of-week patterns", async () => {
      const stats = await computeSpendingStats("user-123", "month", refDate);

      // In our mock, there are only a couple of transaction dates, so instance counts < 3
      for (const w of stats.weekdayStats) {
        if (w.count < 3) {
          expect(w.confidenceMet).toBe(false);
          expect(w.isOutlierHigh).toBe(false);
          expect(w.isOutlierLow).toBe(false);
        }
      }
    });

    it("correctly computes category deltas vs prior period", async () => {
      const stats = await computeSpendingStats("user-123", "month", refDate);

      const groceries = stats.categoryDeltas.find((c) => c.category === "Groceries");
      expect(groceries).toBeDefined();
      expect(groceries?.currentSpend).toBe(5000);
      expect(groceries?.priorSpend).toBe(4000);
      expect(groceries?.changeAbsolute).toBe(1000);
      expect(groceries?.changePercent).toBe(25); // +25%

      const dining = stats.categoryDeltas.find((c) => c.category === "Dining Out");
      expect(dining).toBeDefined();
      expect(dining?.currentSpend).toBe(2500);
      expect(dining?.priorSpend).toBe(1000);
      expect(dining?.changeAbsolute).toBe(1500);
      expect(dining?.changePercent).toBe(150); // +150%
    });

    it("extracts and sorts top outlier transactions", async () => {
      const stats = await computeSpendingStats("user-123", "month", refDate);

      expect(stats.topOutliers.length).toBeGreaterThanOrEqual(3);
      expect(stats.topOutliers[0].amount).toBe(12000);
      expect(stats.topOutliers[0].description).toBe("New Monitor");
    });
  });

  describe("validateAndEnforceCurrency Defensive Backstop", () => {
    it("replaces stray hallucinated dollar signs with user's active currency symbol", () => {
      const mockResult = {
        summary: "You spent $19500 this month and saved $30500.",
        projection: {
          narrative: "Projected spend is $45000 by month end.",
          projectedTotal: 45000,
          comparedToAverage: "$2000 above average",
        },
        patterns: [
          { title: "Friday Spend", narrative: "Fridays average $2500." },
        ],
        opportunities: [
          { title: "Dining", narrative: "Dining is up by $1500.", category: "Dining Out" },
        ],
      };

      const enforced = validateAndEnforceCurrency(mockResult, "INR");
      expect(enforced.summary).toContain("₹19500");
      expect(enforced.summary).toContain("₹30500");
      expect(enforced.summary).not.toContain("$");
      expect(enforced.projection.narrative).toContain("₹45000");
      expect(enforced.patterns[0].narrative).toContain("₹2500");
      expect(enforced.opportunities[0].narrative).toContain("₹1500");
    });
  });
});
