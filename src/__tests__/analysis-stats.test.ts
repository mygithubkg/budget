import { getPeriodDateRange, computeSpendingStats } from "@/lib/analysis/stats";
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

  const mockCollection = jest.fn().mockReturnValue({
    get: mockGet,
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

describe("Deterministic Spending Analysis Engine", () => {
  const { __setMockDocs } = jest.requireMock("@/lib/firebase/admin");

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
      ]);
    });

    it("correctly computes deterministic expense, income, and savings rate", async () => {
      const stats = await computeSpendingStats("user-123", "month", refDate);

      expect(stats.totalExpense).toBe(19500); // 5000 + 2500 + 12000
      expect(stats.totalIncome).toBe(50000);
      expect(stats.savingsRate).toBe(0.61); // (50000 - 19500) / 50000 = 0.61
      expect(stats.daysElapsed).toBe(10);
      expect(stats.daysRemaining).toBe(21);
      expect(stats.daysInPeriod).toBe(31);
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

      expect(stats.topOutliers.length).toBe(3);
      expect(stats.topOutliers[0].amount).toBe(12000);
      expect(stats.topOutliers[0].description).toBe("New Monitor");
      expect(stats.topOutliers[1].amount).toBe(5000);
      expect(stats.topOutliers[2].amount).toBe(2500);
    });

    it("identifies discretionary categories (Dining Out & Electronics)", async () => {
      const stats = await computeSpendingStats("user-123", "month", refDate);

      expect(stats.discretionarySpend).toBe(14500); // 2500 (Dining Out) + 12000 (Electronics)
      expect(stats.discretionarySharePercent).toBe(74); // 14500 / 19500 = ~74%
    });

    it("computes blended month-end trajectory and projection series", async () => {
      const stats = await computeSpendingStats("user-123", "month", refDate);

      expect(stats.projectedMonthEndExpense).toBeGreaterThanOrEqual(stats.totalExpense);
      expect(stats.projectionSeries.length).toBe(31);
      expect(stats.projectionSeries[0].day).toBe(1);
      expect(stats.projectionSeries[30].day).toBe(31);
      expect(stats.projectionSeries[9].actualSpend).toBe(19500); // Day 10
      expect(stats.projectionSeries[30].actualSpend).toBeUndefined(); // Future day has no actualSpend
      expect(stats.projectionSeries[30].projectedSpend).toBe(stats.projectedMonthEndExpense);
    });
  });
});
