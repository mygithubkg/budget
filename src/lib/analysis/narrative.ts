import { getRawAICompletion, cleanAndParseJSON } from "@/lib/ai/aiProvider";
import { ComputedSpendingStats, AIAnalysisResult } from "@/types/analysis";

const ANALYSIS_SYSTEM_PROMPT = `You are a financial analyst writing about the user's own spending, based ONLY on the statistics provided below. Never invent or estimate a number that isn't given to you — if you don't have a figure, describe the pattern qualitatively instead. Keep the tone supportive and matter-of-fact, never judgmental or guilt-inducing — frame observations as useful information, not criticism. This is not financial advice; do not tell the user what to do with their money, only describe patterns and let them draw conclusions.

Respond with ONLY valid JSON matching this schema:
{
  "summary": "2-3 sentence overall picture describing total spend, pace, and savings rate without lecturing.",
  "projection": {
    "narrative": "A concise sentence describing the month-end/period trajectory.",
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
 * Generate AI narrative based strictly on pre-computed deterministic statistics.
 */
export async function generateAIAnalysis(
  uid: string,
  stats: ComputedSpendingStats,
  mode: "full" | "recap" = "full"
): Promise<AIAnalysisResult> {
  const userPayload = `Mode: ${mode}
${mode === "recap" ? "Note: Provide a shorter recap with max 1 notable pattern and 1 opportunity." : "Note: Provide a full comprehensive analysis with 2-3 notable patterns and 2-3 opportunities."}

Statistics:
${JSON.stringify(stats, null, 2)}`;

  try {
    const { content } = await getRawAICompletion(uid, ANALYSIS_SYSTEM_PROMPT, userPayload);
    const parsed = cleanAndParseJSON(content);

    // Validate and sanitize response shape
    const summary = typeof parsed.summary === "string" && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : `You have recorded a total of ${stats.totalExpense.toLocaleString()} in expenses across ${stats.daysElapsed} days this period.`;

    const projection = {
      narrative:
        typeof parsed.projection?.narrative === "string"
          ? parsed.projection.narrative
          : `At your current rate, projected spend for the period is approximately ${stats.projectedMonthEndExpense.toLocaleString()}.`,
      projectedTotal:
        typeof parsed.projection?.projectedTotal === "number"
          ? parsed.projection.projectedTotal
          : stats.projectedMonthEndExpense,
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

    return {
      summary,
      projection,
      patterns: patterns.length > 0 ? patterns : getDefaultPatterns(stats),
      opportunities: opportunities.length > 0 ? opportunities : getDefaultOpportunities(stats),
    };
  } catch (err) {
    console.error("AI Analysis narrative generation error:", err);
    // Fallback gracefully to purely deterministic narrative template if AI call fails
    return getDeterministicFallbackNarrative(stats, mode);
  }
}

function getDefaultPatterns(stats: ComputedSpendingStats): Array<{ title: string; narrative: string }> {
  const patterns: Array<{ title: string; narrative: string }> = [];

  const highWeekday = stats.weekdayStats.find((w) => w.isOutlierHigh);
  if (highWeekday) {
    patterns.push({
      title: `${highWeekday.dayName} Peak Spend`,
      narrative: `Expenses tend to concentrate noticeably on ${highWeekday.dayName}s, averaging ${highWeekday.avgSpend.toLocaleString()} per day over the last 90 days.`,
    });
  }

  if (stats.discretionarySharePercent > 0) {
    patterns.push({
      title: "Discretionary Allocation",
      narrative: `Discretionary categories account for ${stats.discretionarySharePercent}% of recorded spending this period (compared to your 90-day average of ${stats.historicalDiscretionarySharePercent}%).`,
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
        narrative: `Spending in ${topDelta.category} is up by ${Math.abs(topDelta.changePercent)}% (${topDelta.changeAbsolute.toLocaleString()} higher) relative to the prior period.`,
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
  const summary = `During this period, you have recorded ${stats.totalExpense.toLocaleString()} in total expenses against ${stats.totalIncome.toLocaleString()} in income, maintaining a net savings rate of ${Math.round(stats.savingsRate * 100)}%.`;

  const projection = {
    narrative: `Based on your blended pace to date, you are projected to reach ${stats.projectedMonthEndExpense.toLocaleString()} by the end of the period (${Math.abs(stats.projectedDiffPercentage)}% ${stats.projectedDiffPercentage >= 0 ? "above" : "below"} your historical average).`,
    projectedTotal: stats.projectedMonthEndExpense,
    comparedToAverage: `${Math.abs(stats.projectedDiffPercentage)}% ${stats.projectedDiffPercentage >= 0 ? "above" : "below"} 90-day average`,
  };

  return {
    summary,
    projection,
    patterns: getDefaultPatterns(stats),
    opportunities: getDefaultOpportunities(stats),
  };
}
