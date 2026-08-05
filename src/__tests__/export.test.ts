import {
  formatCurrency,
  formatSplits,
  prepareExportData,
  getCurrencySymbol,
  getPDFCurrencySymbol,
} from "@/lib/export/exportData";
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  downloadBlob,
} from "@/lib/export/exportGenerators";
import { Transaction } from "@/types";

// Mock browser globals for jsdom
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = jest.fn();
});

describe("Export Utilities — exportData", () => {
  describe("getCurrencySymbol & getPDFCurrencySymbol", () => {
    it("returns correct currency symbols for CSV/UI", () => {
      expect(getCurrencySymbol("INR")).toBe("₹");
      expect(getCurrencySymbol("USD")).toBe("$");
      expect(getCurrencySymbol("EUR")).toBe("€");
      expect(getCurrencySymbol("GBP")).toBe("£");
      expect(getCurrencySymbol("UNKNOWN")).toBe("₹");
    });

    it("returns PDF-safe ASCII/Latin-1 compatible symbols for standard PDF fonts", () => {
      expect(getPDFCurrencySymbol("INR")).toBe("Rs. ");
      expect(getPDFCurrencySymbol("USD")).toBe("$");
      expect(getPDFCurrencySymbol("EUR")).toBe("EUR ");
      expect(getPDFCurrencySymbol("GBP")).toBe("£");
      expect(getPDFCurrencySymbol("UNKNOWN")).toBe("Rs. ");
    });
  });

  describe("formatCurrency", () => {
    it("formats positive, negative, and zero amounts cleanly", () => {
      expect(formatCurrency(500, "₹")).toBe("₹500");
      expect(formatCurrency(500.5, "₹")).toBe("₹500.50");
      expect(formatCurrency(-250.75, "₹")).toBe("-₹250.75");
      expect(formatCurrency(0, "₹")).toBe("₹0");
    });

    it("supports explicit plus sign when includeSign is true", () => {
      expect(formatCurrency(1200, "₹", true)).toBe("+₹1,200");
      expect(formatCurrency(-350, "₹", true)).toBe("-₹350");
      expect(formatCurrency(0, "₹", true)).toBe("₹0");
    });
  });

  describe("formatSplits", () => {
    it("returns empty string when no splits exist", () => {
      expect(formatSplits(undefined, "₹")).toBe("");
      expect(formatSplits([], "₹")).toBe("");
    });

    it("formats single and multiple friend splits accurately", () => {
      const singleSplit = [
        { friendId: "f1", friendName: "Manas", amount: 250 },
      ];
      expect(formatSplits(singleSplit, "₹")).toBe("Manas: ₹250");

      const multiSplits = [
        { friendId: "f1", friendName: "Manas", amount: 100 },
        { friendId: "f2", friendName: "Priya", amount: 75.5 },
      ];
      expect(formatSplits(multiSplits, "₹")).toBe("Manas: ₹100, Priya: ₹75.50");
    });
  });

  describe("prepareExportData & Passbook Running Balances", () => {
    const mockTransactions: Transaction[] = [
      // Prior to fromDate (should compute into opening balance)
      {
        id: "tx-old-1",
        type: "income",
        amount: 5000,
        userShare: 5000,
        description: "Monthly Salary",
        category: "Salary",
        date: new Date("2026-07-01T10:00:00Z"),
        createdAt: new Date("2026-07-01T10:00:00Z"),
        rawInput: "Salary 5000",
        source: "manual",
      },
      {
        id: "tx-old-2",
        type: "expense",
        amount: 1200,
        userShare: 1200,
        description: "Old Grocery",
        category: "Groceries",
        date: new Date("2026-07-15T12:00:00Z"),
        createdAt: new Date("2026-07-15T12:00:00Z"),
        rawInput: "Old Grocery 1200",
        source: "manual",
      },
      // In range: 2026-08-01 to 2026-08-10
      {
        id: "tx-in-1",
        type: "expense",
        amount: 600,
        userShare: 200,
        description: "Dinner with Manas and Priya",
        category: "Food & Dining",
        date: new Date("2026-08-02T19:30:00Z"),
        createdAt: new Date("2026-08-02T19:30:00Z"),
        rawInput: "Dinner 600 split with Manas 200, Priya 200",
        splits: [
          { friendId: "f1", friendName: "Manas", amount: 200 },
          { friendId: "f2", friendName: "Priya", amount: 200 },
        ],
        source: "chat",
      },
      {
        id: "tx-in-2",
        type: "income",
        amount: 1500,
        userShare: 1500,
        description: "Freelance Project",
        category: "Freelance",
        date: new Date("2026-08-05T14:00:00Z"),
        createdAt: new Date("2026-08-05T14:00:00Z"),
        rawInput: "Freelance 1500",
        source: "telegram",
      },
      // After range
      {
        id: "tx-future-1",
        type: "expense",
        amount: 300,
        userShare: 300,
        description: "Future Purchase",
        category: "Shopping",
        date: new Date("2026-08-20T10:00:00Z"),
        createdAt: new Date("2026-08-20T10:00:00Z"),
        rawInput: "Future purchase 300",
        source: "manual",
      },
    ];

    it("accurately calculates opening balance, running balances, and statement summary", () => {
      const fromDate = new Date("2026-08-01");
      const toDate = new Date("2026-08-10");

      const result = prepareExportData(mockTransactions, fromDate, toDate, "INR");

      // Opening balance: 5000 (income) - 1200 (expense) = 3800
      expect(result.summary.openingBalance).toBe(3800);

      // In range:
      // Row 1: Dinner expense userShare = 200 -> running balance = 3800 - 200 = 3600
      // Row 2: Freelance income = 1500 -> running balance = 3600 + 1500 = 5100
      expect(result.csvExcelRows.length).toBe(2);
      expect(result.pdfRows.length).toBe(2);

      // Verify Row 1
      expect(result.csvExcelRows[0].description).toBe("Dinner with Manas and Priya");
      expect(result.csvExcelRows[0].totalAmount).toBe(600);
      expect(result.csvExcelRows[0].userShare).toBe(200);
      expect(result.csvExcelRows[0].splitWith).toBe("Manas: ₹200, Priya: ₹200");
      expect(result.csvExcelRows[0].runningBalance).toBe(3600);
      expect(result.csvExcelRows[0].source).toBe("chat");

      // Verify Row 2
      expect(result.csvExcelRows[1].description).toBe("Freelance Project");
      expect(result.csvExcelRows[1].totalAmount).toBe(1500);
      expect(result.csvExcelRows[1].runningBalance).toBe(5100);
      expect(result.csvExcelRows[1].source).toBe("telegram");

      // Summary verification
      expect(result.summary.totalIncome).toBe(1500);
      expect(result.summary.totalExpense).toBe(200);
      expect(result.summary.netChange).toBe(1300);
      expect(result.summary.closingBalance).toBe(5100);
      expect(result.summary.transactionCount).toBe(2);
    });

    it("returns empty rows and clean summary if no transactions fall in date range", () => {
      const fromDate = new Date("2025-01-01");
      const toDate = new Date("2025-01-31");

      const result = prepareExportData(mockTransactions, fromDate, toDate, "INR");

      expect(result.summary.openingBalance).toBe(0);
      expect(result.summary.totalIncome).toBe(0);
      expect(result.summary.totalExpense).toBe(0);
      expect(result.summary.closingBalance).toBe(0);
      expect(result.csvExcelRows.length).toBe(0);
      expect(result.pdfRows.length).toBe(0);
    });
  });
});

describe("Export File Generators — exportGenerators", () => {
  const sampleRows = [
    {
      date: "2026-08-02",
      type: "Expense" as const,
      description: "Lunch with Team, Pizza & Drinks",
      category: "Food & Dining",
      totalAmount: 850,
      userShare: 425,
      splitWith: "Alex: ₹425",
      runningBalance: 3575,
      source: "chat",
    },
  ];

  it("triggers CSV export without throwing", () => {
    expect(() => {
      exportToCSV(sampleRows, "2026-08-01", "2026-08-10");
    }).not.toThrow();
  });

  it("triggers Excel (.xlsx) export without throwing", () => {
    expect(() => {
      exportToExcel(sampleRows, "2026-08-01", "2026-08-10");
    }).not.toThrow();
  });

  it("triggers PDF landscape statement export without throwing", () => {
    const mockPreparedData = {
      csvExcelRows: sampleRows,
      pdfRows: [
        {
          date: "02 Aug 2026",
          type: "Expense" as const,
          description: "Lunch with Team, Pizza & Drinks",
          category: "Food & Dining",
          totalAmount: "Rs. 850.00",
          userShare: "Rs. 425.00",
          splitWith: "Alex: Rs. 425",
          runningBalance: "+Rs. 3,575.00",
          source: "chat",
        },
      ],
      summary: {
        openingBalance: 4000,
        totalIncome: 0,
        totalExpense: 425,
        netChange: -425,
        closingBalance: 3575,
        transactionCount: 1,
      },
      fromDateStr: "2026-08-01",
      toDateStr: "2026-08-10",
      currency: "INR",
      currencySymbol: "₹",
      pdfCurrencySymbol: "Rs. ",
    };

    expect(() => {
      exportToPDF(mockPreparedData);
    }).not.toThrow();
  });
});
