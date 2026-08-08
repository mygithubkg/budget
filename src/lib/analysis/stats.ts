import { adminDb } from "@/lib/firebase/admin";
import {
  AnalysisPeriod,
  ComputedSpendingStats,
  WeekdayStat,
  CategoryDelta,
  OutlierTransaction,
  ProjectionPoint,
  ExpectedRecurringItem,
} from "@/types/analysis";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
  differenceInCalendarDays,
  addDays,
} from "date-fns";
import { formatCurrency } from "@/lib/currency";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DISCRETIONARY_CATEGORY_KEYWORDS = [
  "entertainment",
  "shopping",
  "food & dining",
  "dining",
  "restaurant",
  "cafe",
  "coffee",
  "hobby",
  "leisure",
  "electronics",
  "gift",
  "personal",
  "subscriptions",
];

interface RawTxDoc {
  id?: string;
  type: "expense" | "income";
  nature?: "spend" | "transfer" | "income";
  amount: number;
  userShare?: number;
  category: string;
  description: string;
  date: any; // Date | Timestamp | string
}

function parseTxDate(rawDate: any): Date {
  if (!rawDate) return new Date();
  if (rawDate instanceof Date) return rawDate;
  if (typeof rawDate.toDate === "function") return rawDate.toDate();
  if (typeof rawDate === "string") return parseISO(rawDate);
  if (typeof rawDate === "number") return new Date(rawDate);
  return new Date();
}

function isDiscretionary(category: string): boolean {
  if (!category) return false;
  const lower = category.toLowerCase();
  return DISCRETIONARY_CATEGORY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Classifies transaction nature as spend, transfer, or income.
 * Uses explicit field or fallback heuristics for older/unclassified transactions.
 */
export function classifyTxNature(tx: RawTxDoc): "spend" | "transfer" | "income" {
  if (tx.nature) return tx.nature;
  if (tx.type === "income") return "income";

  const text = `${tx.description || ""} ${tx.category || ""}`.toLowerCase();
  const isTransfer =
    /savings|emergency fund|transfer|minimum balance|fixed deposit|\bfd\b|recurring deposit|\brd\b|invested in|mutual fund|\bsip\b|self transfer|to savings|bank minimum/i.test(
      text
    ) ||
    /savings|transfers|investment/i.test(tx.category || "");

  if (isTransfer) return "transfer";
  return "spend";
}

/**
 * Determine effective date boundaries based on period selector
 */
export function getPeriodDateRange(period: AnalysisPeriod, refDate: Date = new Date()): {
  periodStart: Date;
  periodEnd: Date;
  priorStart: Date;
  priorEnd: Date;
} {
  if (period === "week") {
    const periodEnd = refDate;
    const periodStart = subDays(refDate, 6);
    const priorEnd = subDays(periodStart, 1);
    const priorStart = subDays(priorEnd, 6);
    return { periodStart, periodEnd, priorStart, priorEnd };
  }

  if (period === "3months") {
    const periodEnd = refDate;
    const periodStart = subMonths(refDate, 3);
    const priorEnd = subDays(periodStart, 1);
    const priorStart = subMonths(priorEnd, 3);
    return { periodStart, periodEnd, priorStart, priorEnd };
  }

  // default: "month"
  const periodStart = startOfMonth(refDate);
  const periodEnd = endOfMonth(refDate);
  const priorMonthRef = subMonths(refDate, 1);
  const priorStart = startOfMonth(priorMonthRef);
  const priorEnd = endOfMonth(priorMonthRef);
  return { periodStart, periodEnd, priorStart, priorEnd };
}

/**
 * Computes IQR-based statistical outlier thresholds per category.
 * Flag transactions exceeding 1.5 * IQR above Q3 (or 2.5 * median for small samples).
 */
function computeCategoryOutlierThresholds(
  txs: { amount: number; category: string }[]
): Map<string, number> {
  const catMap = new Map<string, number[]>();
  for (const t of txs) {
    const arr = catMap.get(t.category) || [];
    arr.push(t.amount);
    catMap.set(t.category, arr);
  }

  const thresholdMap = new Map<string, number>();

  for (const [cat, amounts] of catMap.entries()) {
    if (amounts.length < 2) {
      thresholdMap.set(cat, Infinity);
      continue;
    }

    const sorted = [...amounts].sort((a, b) => a - b);
    const n = sorted.length;

    if (n >= 4) {
      const q1Index = Math.floor(n * 0.25);
      const q3Index = Math.floor(n * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;
      const threshold = q3 + 1.5 * iqr;
      thresholdMap.set(cat, threshold > 0 ? threshold : Infinity);
    } else {
      const median = sorted[Math.floor(n / 2)];
      const threshold = median * 2.5;
      thresholdMap.set(cat, threshold > 0 ? threshold : Infinity);
    }
  }

  return thresholdMap;
}

/**
 * Lightweight recurring-transaction detector:
 * Identifies repeating bills across 3-6 months (at ~20-35 day intervals with stable amounts)
 * that have NOT yet posted in the current period.
 */
function detectUnpostedRecurringItems(
  allSpendTxs: RawTxDoc[],
  periodStart: Date,
  refDate: Date,
  userCurrency: string
): ExpectedRecurringItem[] {
  // Normalize and group by description signature
  const groups = new Map<string, { txs: RawTxDoc[]; category: string; originalDesc: string }>();

  for (const tx of allSpendTxs) {
    const rawDesc = (tx.description || "").trim();
    if (!rawDesc) continue;
    // Normalize: remove month names, numbers, leading/trailing punctuation
    const normKey = `${tx.category.toLowerCase()}::${rawDesc.toLowerCase().replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|[0-9]+)\b/gi, "").trim()}`;

    const existing = groups.get(normKey) || { txs: [], category: tx.category, originalDesc: rawDesc };
    existing.txs.push(tx);
    groups.set(normKey, existing);
  }

  const unpostedRecurring: ExpectedRecurringItem[] = [];
  const periodStartMs = periodStart.getTime();
  const refDateMs = refDate.getTime();

  for (const group of groups.values()) {
    if (group.txs.length < 2) continue;

    // Sort by date ascending
    const sortedTxs = [...group.txs].sort(
      (a, b) => parseTxDate(a.date).getTime() - parseTxDate(b.date).getTime()
    );

    // Check intervals between consecutive occurrences
    const intervals: number[] = [];
    for (let i = 1; i < sortedTxs.length; i++) {
      const prevDate = parseTxDate(sortedTxs[i - 1].date);
      const currDate = parseTxDate(sortedTxs[i].date);
      const diffDays = differenceInCalendarDays(currDate, prevDate);
      if (diffDays > 0) intervals.push(diffDays);
    }

    if (intervals.length === 0) continue;
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const isMonthlyRecurring = avgInterval >= 20 && avgInterval <= 40;

    if (!isMonthlyRecurring) continue;

    // Check amount stability (all within ±30% of average)
    const amounts = sortedTxs.map((t) => t.userShare !== undefined ? t.userShare : t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const isAmountStable = amounts.every((amt) => Math.abs(amt - avgAmount) / (avgAmount || 1) <= 0.35);

    if (!isAmountStable) continue;

    // Check if this recurring item has already occurred in the current period
    const hasOccurredInCurrentPeriod = sortedTxs.some((t) => {
      const ms = parseTxDate(t.date).getTime();
      return ms >= periodStartMs && ms <= refDateMs;
    });

    if (!hasOccurredInCurrentPeriod) {
      const lastTx = sortedTxs[sortedTxs.length - 1];
      const expectedAmount = Math.round(avgAmount);
      unpostedRecurring.push({
        description: group.originalDesc,
        category: group.category,
        expectedAmount,
        expectedAmountFormatted: formatCurrency(expectedAmount, userCurrency),
        lastSeenDate: format(parseTxDate(lastTx.date), "yyyy-MM-dd"),
        frequencyDays: Math.round(avgInterval),
        occurrencesCount: sortedTxs.length,
      });
    }
  }

  return unpostedRecurring;
}

/**
 * Deterministic aggregation engine: purely computed mathematical statistics with zero AI involvement.
 * Implements currency pre-formatting, transfer exclusion, per-category IQR outlier filtering,
 * 3+ instance confidence thresholds, and recurring unposted item detection.
 */
export async function computeSpendingStats(
  uid: string,
  period: AnalysisPeriod = "month",
  refDate: Date = new Date()
): Promise<ComputedSpendingStats> {
  const { periodStart, periodEnd, priorStart, priorEnd } = getPeriodDateRange(period, refDate);
  const trailing90DaysStart = subDays(refDate, 90);

  // 1. Fetch user profile for preferred currency
  let userCurrency = "INR";
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (userDoc.exists && userDoc.data()?.currency) {
      userCurrency = userDoc.data()!.currency;
    }
  } catch (err) {
    console.warn("Could not fetch user currency for stats, using default INR:", err);
  }

  // 2. Fetch all user transactions
  const snapshot = await adminDb
    .collection(`users/${uid}/transactions`)
    .get();

  const allTransactions: RawTxDoc[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    allTransactions.push({
      id: doc.id,
      type: data.type || "expense",
      nature: data.nature || undefined,
      amount: Number(data.amount) || 0,
      userShare: data.userShare !== undefined ? Number(data.userShare) : Number(data.amount) || 0,
      category: data.category || "General",
      description: data.description || "Expense",
      date: data.date,
    });
  });

  // Buckets for different date windows
  const currentPeriodTxs: RawTxDoc[] = [];
  const priorPeriodTxs: RawTxDoc[] = [];
  const trailing90DaysTxs: RawTxDoc[] = [];
  const allHistoricalSpendTxs: RawTxDoc[] = [];

  const periodStartMs = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate(), 0, 0, 0).getTime();
  const periodEndMs = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 23, 59, 59).getTime();
  const priorStartMs = new Date(priorStart.getFullYear(), priorStart.getMonth(), priorStart.getDate(), 0, 0, 0).getTime();
  const priorEndMs = new Date(priorEnd.getFullYear(), priorEnd.getMonth(), priorEnd.getDate(), 23, 59, 59).getTime();
  const trailing90Ms = new Date(trailing90DaysStart.getFullYear(), trailing90DaysStart.getMonth(), trailing90DaysStart.getDate(), 0, 0, 0).getTime();
  const refDateMs = refDate.getTime();

  for (const tx of allTransactions) {
    const txDate = parseTxDate(tx.date);
    const txMs = txDate.getTime();

    if (txMs >= periodStartMs && txMs <= periodEndMs) {
      currentPeriodTxs.push(tx);
    }
    if (txMs >= priorStartMs && txMs <= priorEndMs) {
      priorPeriodTxs.push(tx);
    }
    if (txMs >= trailing90Ms && txMs <= refDateMs) {
      trailing90DaysTxs.push(tx);
    }
    if (classifyTxNature(tx) === "spend" && tx.type === "expense") {
      allHistoricalSpendTxs.push(tx);
    }
  }

  // 3. Current period financial totals (Distinguishing genuine spending from transfers & savings)
  let totalExpense = 0;
  let totalIncome = 0;
  let discretionarySpend = 0;
  let transfersTotal = 0;
  let transfersCount = 0;
  const currentCatSpendMap: Record<string, number> = {};

  for (const tx of currentPeriodTxs) {
    const effectiveAmount = tx.userShare !== undefined ? tx.userShare : tx.amount;
    const nature = classifyTxNature(tx);

    if (nature === "income" || tx.type === "income") {
      totalIncome += effectiveAmount;
    } else if (nature === "transfer") {
      // Exclude transfers from genuine spending totals
      transfersTotal += effectiveAmount;
      transfersCount += 1;
    } else {
      // Genuine expense / spend
      totalExpense += effectiveAmount;
      currentCatSpendMap[tx.category] = (currentCatSpendMap[tx.category] || 0) + effectiveAmount;
      if (isDiscretionary(tx.category)) {
        discretionarySpend += effectiveAmount;
      }
    }
  }

  // Prior period category spending (excluding transfers)
  const priorCatSpendMap: Record<string, number> = {};
  for (const tx of priorPeriodTxs) {
    const effectiveAmount = tx.userShare !== undefined ? tx.userShare : tx.amount;
    const nature = classifyTxNature(tx);
    if (nature === "spend" && tx.type === "expense") {
      priorCatSpendMap[tx.category] = (priorCatSpendMap[tx.category] || 0) + effectiveAmount;
    }
  }

  // 4. Trailing 90-day baseline stats with Outlier Exclusion
  const trailingSpendTxs = trailing90DaysTxs
    .filter((tx) => classifyTxNature(tx) === "spend" && tx.type === "expense")
    .map((tx) => ({
      ...tx,
      effectiveAmount: tx.userShare !== undefined ? tx.userShare : tx.amount,
    }));

  const outlierThresholds = computeCategoryOutlierThresholds(
    trailingSpendTxs.map((t) => ({ amount: t.effectiveAmount, category: t.category }))
  );

  let trailing90Expense = 0;
  let trailing90Income = 0;
  let trailing90Discretionary = 0;
  let outliersExcludedCount = 0;

  // Track spending per day-of-week with set of distinct calendar dates
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  const weekdayDateSets: Set<string>[] = [
    new Set(),
    new Set(),
    new Set(),
    new Set(),
    new Set(),
    new Set(),
    new Set(),
  ];

  for (const tx of trailing90DaysTxs) {
    const effectiveAmount = tx.userShare !== undefined ? tx.userShare : tx.amount;
    const txDate = parseTxDate(tx.date);
    const nature = classifyTxNature(tx);

    if (nature === "income" || tx.type === "income") {
      trailing90Income += effectiveAmount;
    } else if (nature === "spend") {
      const threshold = outlierThresholds.get(tx.category) || Infinity;
      const isOutlier = effectiveAmount > threshold;

      if (isOutlier) {
        outliersExcludedCount++;
      } else {
        trailing90Expense += effectiveAmount;
        if (isDiscretionary(tx.category)) {
          trailing90Discretionary += effectiveAmount;
        }
        const dayIndex = txDate.getDay();
        const dateKey = format(txDate, "yyyy-MM-dd");
        weekdayTotals[dayIndex] += effectiveAmount;
        weekdayDateSets[dayIndex].add(dateKey);
      }
    }
  }

  const trailingDailyAvg = trailing90Expense > 0 ? trailing90Expense / 90 : 0;
  const historicalSavingsRate =
    trailing90Income > 0
      ? Math.round(((trailing90Income - trailing90Expense) / trailing90Income) * 100) / 100
      : 0;
  const historicalDiscretionarySharePercent =
    trailing90Expense > 0
      ? Math.round((trailing90Discretionary / trailing90Expense) * 100)
      : 0;

  // 5. Time calculations & Multi-Factor Month-End Projection
  const totalDaysInPeriod = Math.max(1, differenceInCalendarDays(periodEnd, periodStart) + 1);
  const rawElapsed = differenceInCalendarDays(refDate, periodStart) + 1;
  const daysElapsed = Math.min(totalDaysInPeriod, Math.max(1, rawElapsed));
  const daysRemaining = Math.max(0, totalDaysInPeriod - daysElapsed);

  const currentDailyAvg = totalExpense / daysElapsed;

  // Blended weighting: early in the period lean on 90-day baseline; late in period lean on actual pace
  const weight = Math.min(1.0, Math.max(0.0, daysElapsed / totalDaysInPeriod));
  const fallbackDailyBaseline = trailingDailyAvg > 0 ? trailingDailyAvg : currentDailyAvg;
  const blendedDailyRate = weight * currentDailyAvg + (1.0 - weight) * fallbackDailyBaseline;

  // Outlier-adjusted pace projection
  const paceProjection = Math.round(totalExpense + daysRemaining * blendedDailyRate);

  // Unposted recurring items detection
  const expectedRecurringItems = detectUnpostedRecurringItems(
    allHistoricalSpendTxs,
    periodStart,
    refDate,
    userCurrency
  );
  const recurringNotYetOccurredTotal = expectedRecurringItems.reduce(
    (sum, item) => sum + item.expectedAmount,
    0
  );

  // Grounded Multi-Factor Projection: Pace + Unposted Recurring Bills
  const projectedMonthEndExpense = paceProjection + recurringNotYetOccurredTotal;
  const historicalExpectedPeriodExpense = Math.round(fallbackDailyBaseline * totalDaysInPeriod);
  const projectedDiffPercentage =
    historicalExpectedPeriodExpense > 0
      ? Math.round(
          ((projectedMonthEndExpense - historicalExpectedPeriodExpense) /
            historicalExpectedPeriodExpense) *
            100
        )
      : 0;

  const currentPeriodSpendTxs = currentPeriodTxs.filter(
    (tx) => classifyTxNature(tx) === "spend" && tx.type === "expense"
  );
  const isEarlyEstimate = daysElapsed <= 5 || currentPeriodSpendTxs.length < 5;

  // 6. Projection Series for Line Chart (Cumulative Actual vs Projected)
  const projectionSeries: ProjectionPoint[] = [];
  const dailySpendBuckets: number[] = new Array(totalDaysInPeriod).fill(0);

  for (const tx of currentPeriodTxs) {
    if (classifyTxNature(tx) === "spend" && tx.type === "expense") {
      const txDate = parseTxDate(tx.date);
      const dayOffset = differenceInCalendarDays(txDate, periodStart);
      const txDayIndex = Math.min(totalDaysInPeriod - 1, Math.max(0, dayOffset));
      dailySpendBuckets[txDayIndex] += tx.userShare !== undefined ? tx.userShare : tx.amount;
    }
  }

  let runningActual = 0;
  for (let d = 0; d < totalDaysInPeriod; d++) {
    const dayNumber = d + 1;
    const dayDate = addDays(periodStart, d);
    const dateStr = format(dayDate, "yyyy-MM-dd");

    if (dayNumber <= daysElapsed) {
      runningActual += dailySpendBuckets[d];
      const roundedActual = Math.round(runningActual);
      projectionSeries.push({
        day: dayNumber,
        dateStr,
        actualSpend: roundedActual,
        actualSpendFormatted: formatCurrency(roundedActual, userCurrency),
        projectedSpend: roundedActual,
        projectedSpendFormatted: formatCurrency(roundedActual, userCurrency),
      });
    } else {
      const daysAhead = dayNumber - daysElapsed;
      const recurringPortion =
        daysRemaining > 0 ? (daysAhead / daysRemaining) * recurringNotYetOccurredTotal : 0;
      const projectedStep = Math.round(
        runningActual + daysAhead * blendedDailyRate + recurringPortion
      );
      projectionSeries.push({
        day: dayNumber,
        dateStr,
        projectedSpend: projectedStep,
        projectedSpendFormatted: formatCurrency(projectedStep, userCurrency),
      });
    }
  }

  // 7. Day-of-week patterns with 3+ Instance Confidence Threshold
  const weekdayStats: WeekdayStat[] = [];
  const totalWeekdaySpend = weekdayTotals.reduce((a, b) => a + b, 0);
  const weeklyMeanSpend = totalWeekdaySpend / 7;

  for (let i = 0; i < 7; i++) {
    const total = weekdayTotals[i];
    const instanceCount = weekdayDateSets[i].size;
    const avgSpend = instanceCount > 0 ? Math.round(total / instanceCount) : 0;
    const confidenceMet = instanceCount >= 3;

    // Outlier flags only surfaced if confidence threshold (3+ instances) is satisfied
    const isOutlierHigh =
      confidenceMet && weeklyMeanSpend > 0 && total > weeklyMeanSpend * 1.3;
    const isOutlierLow =
      confidenceMet && weeklyMeanSpend > 0 && total < weeklyMeanSpend * 0.7 && total > 0;

    const roundedTotal = Math.round(total);
    weekdayStats.push({
      dayIndex: i,
      dayName: WEEKDAY_NAMES[i],
      totalSpend: roundedTotal,
      totalSpendFormatted: formatCurrency(roundedTotal, userCurrency),
      avgSpend,
      avgSpendFormatted: formatCurrency(avgSpend, userCurrency),
      count: instanceCount,
      confidenceMet,
      isOutlierHigh,
      isOutlierLow,
    });
  }

  // 8. Category Deltas
  const allCategoryNames = Array.from(
    new Set([...Object.keys(currentCatSpendMap), ...Object.keys(priorCatSpendMap)])
  );

  const categoryDeltas: CategoryDelta[] = allCategoryNames
    .map((cat) => {
      const currentSpend = Math.round(currentCatSpendMap[cat] || 0);
      const priorSpend = Math.round(priorCatSpendMap[cat] || 0);
      const changeAbsolute = currentSpend - priorSpend;
      const changePercent =
        priorSpend > 0
          ? Math.round(((currentSpend - priorSpend) / priorSpend) * 100)
          : currentSpend > 0
          ? 100
          : 0;

      return {
        category: cat,
        currentSpend,
        currentSpendFormatted: formatCurrency(currentSpend, userCurrency),
        priorSpend,
        priorSpendFormatted: formatCurrency(priorSpend, userCurrency),
        changePercent,
        changeAbsolute,
        changeAbsoluteFormatted: formatCurrency(changeAbsolute, userCurrency),
      };
    })
    .filter((cd) => cd.currentSpend > 0 || cd.priorSpend > 0)
    .sort((a, b) => Math.abs(b.changeAbsolute) - Math.abs(a.changeAbsolute));

  // 9. Top Outlier Transactions (Includes notable genuine expenses & transfers)
  const topOutliers: OutlierTransaction[] = currentPeriodTxs
    .filter((tx) => tx.type === "expense")
    .sort((a, b) => (b.userShare || b.amount) - (a.userShare || a.amount))
    .slice(0, 5)
    .map((tx) => {
      const amt = Math.round(tx.userShare !== undefined ? tx.userShare : tx.amount);
      return {
        id: tx.id,
        description: tx.description,
        amount: amt,
        amountFormatted: formatCurrency(amt, userCurrency),
        category: tx.category,
        date: format(parseTxDate(tx.date), "yyyy-MM-dd"),
      };
    });

  // 10. Savings rate & discretionary percentages
  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) / 100
      : 0;

  const discretionarySharePercent =
    totalExpense > 0 ? Math.round((discretionarySpend / totalExpense) * 100) : 0;

  const roundedTotalExpense = Math.round(totalExpense);
  const roundedTotalIncome = Math.round(totalIncome);
  const roundedCurrentDailyAvg = Math.round(currentDailyAvg);
  const roundedTrailingDailyAvg = Math.round(trailingDailyAvg);
  const roundedDiscretionarySpend = Math.round(discretionarySpend);
  const roundedTransfersTotal = Math.round(transfersTotal);

  return {
    period,
    userCurrency,
    startDate: format(periodStart, "yyyy-MM-dd"),
    endDate: format(periodEnd, "yyyy-MM-dd"),
    daysElapsed,
    daysRemaining,
    daysInPeriod: totalDaysInPeriod,
    isEarlyEstimate,

    totalExpense: roundedTotalExpense,
    totalExpenseFormatted: formatCurrency(roundedTotalExpense, userCurrency),
    totalIncome: roundedTotalIncome,
    totalIncomeFormatted: formatCurrency(roundedTotalIncome, userCurrency),
    savingsRate,
    savingsRatePercentFormatted: `${Math.round(savingsRate * 100)}%`,
    historicalSavingsRate,
    historicalSavingsRatePercentFormatted: `${Math.round(historicalSavingsRate * 100)}%`,

    currentDailyAvg: roundedCurrentDailyAvg,
    currentDailyAvgFormatted: formatCurrency(roundedCurrentDailyAvg, userCurrency),
    trailingDailyAvg: roundedTrailingDailyAvg,
    trailingDailyAvgFormatted: formatCurrency(roundedTrailingDailyAvg, userCurrency),

    paceProjection,
    paceProjectionFormatted: formatCurrency(paceProjection, userCurrency),
    recurringNotYetOccurredTotal,
    recurringNotYetOccurredTotalFormatted: formatCurrency(recurringNotYetOccurredTotal, userCurrency),
    expectedRecurringItems,
    projectedMonthEndExpense,
    projectedMonthEndExpenseFormatted: formatCurrency(projectedMonthEndExpense, userCurrency),
    projectedDiffPercentage,

    projectionSeries,
    weekdayStats,
    categoryDeltas,
    topOutliers,
    outliersExcludedCount,

    discretionarySpend: roundedDiscretionarySpend,
    discretionarySpendFormatted: formatCurrency(roundedDiscretionarySpend, userCurrency),
    discretionarySharePercent,
    historicalDiscretionarySharePercent,

    transfersTotal: roundedTransfersTotal,
    transfersTotalFormatted: formatCurrency(roundedTransfersTotal, userCurrency),
    transfersCount,
  };
}
