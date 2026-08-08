import { getRawAICompletion, cleanAndParseJSON } from "@/lib/ai/aiProvider";
import { ComputedSpendingStats, AIAnalysisResult } from "@/types/analysis";
import { getCurrencySymbol } from "@/lib/currency";

const ANALYSIS_SYSTEM_PROMPT = `You are a financial analyst writing about the user's personal finances based ONLY on the pre-computed statistics provided below.

CRITICAL RULES:
1. ZERO-MATH & CURRENCY VERBATIM RULE:
   - The AI only interprets numbers, never computes, converts, or invents them.
   - Every monetary amount you mention in your narrative MUST BE COPIED EXACTLY from the provided "*Formatted" strings (e.g. totalExpenseFormatted, projectedMonthEndExpenseFormatted, currentDailyAvgFormatted, avgSpendFormatted, expectedAmountFormatted, transfersTotalFormatted).
   - NEVER invent a currency symbol, NEVER default to "$", NEVER alter the provided currency format.
2. PATTERN CONFIDENCE & INTEGRITY:
   - Only describe day-of-week trends as established behavioral patterns if "confidenceMet" is true (which requires at least 3 distinct occurrences).
   - If confidence is false or data is limited, describe observations as incidental to this specific period rather than an established habit.
   - One-time transfers (transfersTotalFormatted) are excluded from spending pace; acknowledge them as savings/transfers, not spending.
3. GROUNDED PROJECTIONS:
   - The projected total is multi-factor: it combines outlier-adjusted daily pace with expected recurring bills (expectedRecurringItems) not yet posted this period.
   - If expectedRecurringItems exists, briefly mention them (e.g. "...includes an expected rent/bill payment of ₹X that hasn't posted yet").
   - If isEarlyEstimate is true, frame it supportively: "This is an early estimate that will firm up as the period continues."
4. TONE & GUIDELINES:
   - Supportive, objective, and matter-of-fact. Never judgmental, scolding, or lecturing.
   - This is descriptive analysis, not financial advice.

Respond with ONLY valid JSON matching this schema:
{
  "summary": "2-3 sentence executive picture describing total spend, pace, and savings rate without lecturing.",
  "projection": {
    "narrative": "A concise sentence describing the month-end trajectory, noting early estimate or expected recurring bills if applicable.",
    "projectedTotal": 12345,
    "comparedToAverage": "e.g. 12% above your 90-day baseline pace"
  },
  "patterns": [
    { "title": "Headline", "narrative": "Specific observation about weekday trends, category shifts, or pacing." }
  ],
  "opportunities": [
    { "title": "Headline", "narrative": "Neutral observation of category changes or discretionary spend worth reviewing.", "category": "CategoryName or null" }
  ]
}`;

/**
 * Defensive backstop: ensures no misplaced currency symbols (e.g. hallucinated "$") leak through.
 */
export function validateAndEnforceCurrency(
  result: AIAnalysisResult,
  userCurrency: string
): AIAnalysisResult {
  const symbol = getCurrencySymbol(userCurrency);

  const sanitizeText = (text: string): string => {
    if (!text) return text;
    if (symbol !== "$") {
      // Replace rogue $ symbols with the user's configured currency symbol
      return text.replace(/\$\s*(\d+(?:[.,]\d+)*)/g, `${symbol}$1`);
    }
    return text;
  };

  return {
    summary: sanitizeText(result.summary),
    projection: {
      narrative: sanitizeText(result.projection.narrative),
      projectedTotal: result.projection.projectedTotal,
      projectedTotalFormatted: result.projection.projectedTotalFormatted,
      comparedToAverage: sanitizeText(result.projection.comparedToAverage),
    },
    patterns: result.patterns.map((p) => ({
      title: sanitizeText(p.title),
      narrative: sanitizeText(p.narrative),
    })),
    opportunities: result.opportunities.map((o) => ({
      title: sanitizeText(o.title),
      narrative: sanitizeText(o.narrative),
      category: o.category ? sanitizeText(o.category) : null,
    })),
  };
}

/**
 * Generate AI narrative based strictly on pre-computed deterministic statistics.
 */
export async function generateAIAnalysis(
  uid: string,
  stats: ComputedSpendingStats,
  mode: "full" | "recap" = "full"
): Promise<AIAnalysisResult> {
  const userPayload = `Mode: ${mode}
${mode === "recap" ? "Note: Provide a concise recap with 1 notable pattern and 1 opportunity." : "Note: Provide a full comprehensive analysis with 2-3 notable patterns and 2-3 opportunities."}

Computed Statistics:
${JSON.stringify(stats, null, 2)}`;

  try {
    const { content } = await getRawAICompletion(uid, ANALYSIS_SYSTEM_PROMPT, userPayload);
    const parsed = cleanAndParseJSON(content);

    // Validate and sanitize response shape
    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : `You have recorded ${stats.totalExpenseFormatted} in expenses across ${stats.daysElapsed} days this period, with a savings rate of ${stats.savingsRatePercentFormatted}.`;

    const projection = {
      narrative:
        typeof parsed.projection?.narrative === "string"
          ? parsed.projection.narrative
          : `At your current pace, projected period spend is ${stats.projectedMonthEndExpenseFormatted}${stats.recurringNotYetOccurredTotal > 0 ? ` (including ${stats.recurringNotYetOccurredTotalFormatted} in expected upcoming recurring bills)` : ""}.`,
      projectedTotal:
        typeof parsed.projection?.projectedTotal === "number"
          ? parsed.projection.projectedTotal
          : stats.projectedMonthEndExpense,
      projectedTotalFormatted: stats.projectedMonthEndExpenseFormatted,
      comparedToAverage:
        typeof parsed.projection?.comparedToAverage === "string"
          ? parsed.projection.comparedToAverage
          : `${Math.abs(stats.projectedDiffPercentage)}% ${stats.projectedDiffPercentage >= 0 ? "above" : "below"} historical baseline`,
    };

    const patterns = Array.isArray(parsed.patterns)
      ? parsed.patterns
          .filter((p: any) => p && typeof p.title === "string" && typeof p.narrative === "string")
          .map((p: any) => ({ title: p.title.trim(), narrative: p.narrative.trim() }))
      : [];

    const opportunities = Array.isArray(parsed.opportunities)
      ? parsed.opportunities
          .filter((o: any) => o && typeof o.title === "string" && typeof o.narrative === "string")
          .map((o: any) => ({
            title: o.title.trim(),
            narrative: o.narrative.trim(),
            category: typeof o.category === "string" ? o.category.trim() : null,
          }))
      : [];

    const rawResult: AIAnalysisResult = {
      summary,
      projection,
      patterns: patterns.length > 0 ? patterns : getDefaultPatterns(stats),
      opportunities: opportunities.length > 0 ? opportunities : getDefaultOpportunities(stats),
    };

    // Run defensive currency validator pass
    return validateAndEnforceCurrency(rawResult, stats.userCurrency);
  } catch (err) {
    console.error("AI Analysis narrative generation error:", err);
    // Fallback gracefully to purely deterministic narrative template if AI call fails
    return getDeterministicFallbackNarrative(stats, mode);
  }
}

function getDefaultPatterns(stats: ComputedSpendingStats): Array<{ title: string; narrative: string }> {
  const patterns: Array<{ title: string; narrative: string }> = [];

  const highWeekday = stats.weekdayStats.find((w) => w.isOutlierHigh && w.confidenceMet);
  if (highWeekday) {
    patterns.push({
      title: `${highWeekday.dayName} Peak Spend`,
      narrative: `Expenses consistently concentrate on ${highWeekday.dayName}s, averaging ${highWeekday.avgSpendFormatted} per day across past weeks.`,
    });
  }

  if (stats.discretionarySharePercent > 0) {
    patterns.push({
      title: "Discretionary Allocation",
      narrative: `Discretionary categories represent ${stats.discretionarySharePercent}% of recorded spending (${stats.discretionarySpendFormatted}), compared to your 90-day baseline of ${stats.historicalDiscretionarySharePercent}%.`,
    });
  }

  return patterns;
}

function getDefaultOpportunities(stats: ComputedSpendingStats): Array<{ title: string; narrative: string; category: string | null }> {
  const opportunities: Array<{ title: string; narrative: string; category: string | null }> = [];

  if (stats.categoryDeltas.length > 0) {
    const topDelta = stats.categoryDeltas[0];
    if (topDelta.changeAbsolute > 0) {
      opportunities.push({
        title: `${topDelta.category} Activity`,
        narrative: `Spending in ${topDelta.category} is ${topDelta.changeAbsoluteFormatted} higher (+${Math.abs(topDelta.changePercent)}%) relative to the prior period.`,
        category: topDelta.category,
      });
    }
  }

  return opportunities;
}

function getDeterministicFallbackNarrative(
  stats: ComputedSpendingStats,
  mode: "full" | "recap"
): AIAnalysisResult {
  const summary = `During this period, you have recorded ${stats.totalExpenseFormatted} in expenses against ${stats.totalIncomeFormatted} in income, maintaining a net savings rate of ${stats.savingsRatePercentFormatted}.${stats.transfersTotal > 0 ? ` Additionally, ${stats.transfersTotalFormatted} was moved to savings/transfers.` : ""}`;

  const projection = {
    narrative: `Based on your outlier-adjusted pace, projected period spend is ${stats.projectedMonthEndExpenseFormatted} (${Math.abs(stats.projectedDiffPercentage)}% ${stats.projectedDiffPercentage >= 0 ? "above" : "below"} your historical average)${stats.recurringNotYetOccurredTotal > 0 ? `, including ${stats.recurringNotYetOccurredTotalFormatted} in expected upcoming bills` : ""}.${stats.isEarlyEstimate ? " (Early estimate)" : ""}`,
    projectedTotal: stats.projectedMonthEndExpense,
    projectedTotalFormatted: stats.projectedMonthEndExpenseFormatted,
    comparedToAverage: `${Math.abs(stats.projectedDiffPercentage)}% ${stats.projectedDiffPercentage >= 0 ? "above" : "below"} 90-day average`,
  };

  const rawFallback: AIAnalysisResult = {
    summary,
    projection,
    patterns: getDefaultPatterns(stats),
    opportunities: getDefaultOpportunities(stats),
  };

  return validateAndEnforceCurrency(rawFallback, stats.userCurrency);
}
