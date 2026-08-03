import {
  normalizeCategory,
  calculateSimilarity,
  findSimilarCategory,
} from "../lib/category-utils";

describe("Category Utilities", () => {
  describe("normalizeCategory", () => {
    it("should lowercase and strip punctuation", () => {
      expect(normalizeCategory("Food & Dining!")).toBe("food dining");
      expect(normalizeCategory("Travel/Transport")).toBe("travel transport");
    });
  });

  describe("calculateSimilarity", () => {
    it("should return 1 for identical strings", () => {
      expect(calculateSimilarity("Food", "food")).toBe(1);
    });

    it("should calculate high similarity for typos", () => {
      const sim = calculateSimilarity("Groceriez", "Groceries");
      expect(sim).toBeGreaterThan(0.85);
    });
  });

  describe("findSimilarCategory (85% dedup logic)", () => {
    const existing = ["Food", "Groceries", "Travel/Transport", "Entertainment"];

    it("should match exact category case-insensitively", () => {
      const match = findSimilarCategory("food", existing);
      expect(match.isExisting).toBe(true);
      expect(match.resolvedName).toBe("Food");
    });

    it("should match near identical typo category above 85% threshold", () => {
      const match = findSimilarCategory("Groceriez", existing);
      expect(match.isExisting).toBe(true);
      expect(match.resolvedName).toBe("Groceries");
    });

    it("should treat completely novel category as new", () => {
      const match = findSimilarCategory("Cryptocurrency", existing);
      expect(match.isExisting).toBe(false);
      expect(match.resolvedName).toBe("Cryptocurrency");
    });
  });
});
