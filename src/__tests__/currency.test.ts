import { formatCurrency, getCurrencySymbol } from "../lib/currency";

describe("Currency Utilities", () => {
  it("should return the correct symbol for supported currencies", () => {
    expect(getCurrencySymbol("INR")).toBe("₹");
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("should correctly format currency numbers", () => {
    const formattedINR = formatCurrency(500, "INR");
    expect(formattedINR).toContain("500");

    const formattedUSD = formatCurrency(1250.5, "USD");
    expect(formattedUSD).toContain("1,250.50");
  });
});
