import {
  parseCleanNumber,
  parseCleanDate,
  extractSpreadsheetGrid,
} from "../tabular-parser";
import * as XLSX from "xlsx";

describe("Tabular Parser Utilities", () => {
  describe("parseCleanNumber", () => {
    it("parses standard integer and decimal strings", () => {
      expect(parseCleanNumber("100")).toBe(100);
      expect(parseCleanNumber("250.75")).toBe(250.75);
      expect(parseCleanNumber(45.5)).toBe(45.5);
    });

    it("strips currency symbols and commas", () => {
      expect(parseCleanNumber("$1,250.00")).toBe(1250);
      expect(parseCleanNumber("₹ 3,450.50")).toBe(3450.5);
      expect(parseCleanNumber("EUR 500.00")).toBe(500);
    });

    it("handles accounting parenthesis and minus signs for negative values", () => {
      expect(parseCleanNumber("(450.00)")).toBe(-450);
      expect(parseCleanNumber("-120.50")).toBe(-120.5);
      expect(parseCleanNumber("300-")).toBe(-300);
    });

    it("handles European decimal comma format", () => {
      expect(parseCleanNumber("1.234,50")).toBe(1234.5);
      expect(parseCleanNumber("45,50")).toBe(45.5);
    });

    it("returns null for invalid inputs", () => {
      expect(parseCleanNumber("")).toBeNull();
      expect(parseCleanNumber(null)).toBeNull();
      expect(parseCleanNumber(undefined)).toBeNull();
      expect(parseCleanNumber("abc")).toBeNull();
    });
  });

  describe("parseCleanDate", () => {
    it("parses ISO date strings", () => {
      expect(parseCleanDate("2026-08-04")).toBe("2026-08-04");
      expect(parseCleanDate("2026-01-15T10:30:00Z")).toBe("2026-01-15");
    });

    it("parses dd/MM/yyyy formats", () => {
      expect(parseCleanDate("15/08/2026")).toBe("2026-08-15");
      expect(parseCleanDate("05-09-2026")).toBe("2026-09-05");
      expect(parseCleanDate("12.10.2026")).toBe("2026-10-12");
    });

    it("parses dd-MMM-yyyy formats", () => {
      expect(parseCleanDate("04-Aug-2026")).toBe("2026-08-04");
      expect(parseCleanDate("15 Jan 2026")).toBe("2026-01-15");
    });

    it("parses Excel epoch serial numbers", () => {
      // 45143 = Aug 5, 2023 approx
      const parsed = parseCleanDate(45143);
      expect(parsed).toMatch(/^2023-08-/);
    });
  });

  describe("extractSpreadsheetGrid", () => {
    it("extracts rows from XLSX buffer", () => {
      const data = [
        ["Date", "Description", "Debit", "Credit"],
        ["2026-08-01", "Coffee Shop", "250", ""],
        ["2026-08-02", "Salary", "", "50000"],
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Statement");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const rows = extractSpreadsheetGrid(buffer);
      expect(rows.length).toBe(2);
      expect(rows[0]["Description"]).toBe("Coffee Shop");
      expect(rows[0]["Debit"]).toBe("250");
      expect(rows[1]["Description"]).toBe("Salary");
      expect(rows[1]["Credit"]).toBe("50000");
    });
  });
});
