import levenshtein from "fast-levenshtein";

/**
 * Normalizes a category string:
 * - Converts to lowercase
 * - Strips special punctuation (keeps alphanumeric and spaces)
 * - Collapses multiple spaces and trims
 */
export function normalizeCategory(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[/&_-]/g, " ") // replace common separators with spaces
    .replace(/[^\w\s]/g, "") // strip remaining punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes Levenshtein similarity ratio between two strings: 0 to 1
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeCategory(str1);
  const norm2 = normalizeCategory(str2);

  if (norm1 === norm2) return 1.0;
  if (!norm1.length || !norm2.length) return 0.0;

  // Direct substring / prefix containment
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    // If one is a significant part of the other (e.g. "food" in "food dining" or "travel" in "travel transport")
    if (minLen / maxLen >= 0.5) {
      return Math.max(0.86, minLen / maxLen);
    }
  }

  // Word token overlap check (Jaccard on words)
  const words1 = norm1.split(" ").filter(Boolean);
  const words2 = norm2.split(" ").filter(Boolean);
  const set2 = new Set(words2);
  const intersectionWords = words1.filter((w) => set2.has(w));
  if (intersectionWords.length > 0) {
    const unionSet = new Set(words1.concat(words2));
    const jaccard = intersectionWords.length / unionSet.size;
    if (jaccard >= 0.5) {
      return Math.max(0.86, jaccard);
    }
  }

  const distance = levenshtein.get(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  return 1 - distance / maxLength;
}

/**
 * Matches a candidate category name against an existing list of category names.
 * If similarity >= threshold (default 0.85), returns the existing category.
 * Otherwise returns the formatted candidate name.
 */
export function findSimilarCategory(
  candidate: string,
  existingCategories: string[],
  threshold = 0.85
): { resolvedName: string; isExisting: boolean; similarity: number } {
  const trimmed = candidate.trim();
  if (!trimmed) {
    return { resolvedName: "Miscellaneous", isExisting: true, similarity: 1 };
  }

  // 1. Exact case-insensitive match
  const exactMatch = existingCategories.find(
    (c) => c.trim().toLowerCase() === trimmed.toLowerCase()
  );
  if (exactMatch) {
    return { resolvedName: exactMatch, isExisting: true, similarity: 1.0 };
  }

  // 2. Similarity check
  let bestMatch = "";
  let highestSimilarity = 0;

  for (const existing of existingCategories) {
    const sim = calculateSimilarity(trimmed, existing);
    if (sim > highestSimilarity) {
      highestSimilarity = sim;
      bestMatch = existing;
    }
  }

  if (highestSimilarity >= threshold && bestMatch) {
    return {
      resolvedName: bestMatch,
      isExisting: true,
      similarity: highestSimilarity,
    };
  }

  // Capitalize words nicely if it's a new category
  const capitalized = trimmed
    .split(" ")
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");

  return {
    resolvedName: capitalized,
    isExisting: false,
    similarity: highestSimilarity,
  };
}
