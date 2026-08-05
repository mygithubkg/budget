import { adminDb } from "@/lib/firebase/admin";
import {
  AnalysisPeriod,
  ComputedSpendingStats,
  WeekdayStat,
  CategoryDelta,
  OutlierTransaction,
  ProjectionPoint,
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
 * Deterministic aggregation engine: purely computed mathematical statistics with zero AI involvement.
 */
export async function computeSpendingStats(
  uid: string,
  period: AnalysisPeriod = "month",
  refDate: Date = new Date()
): Promise<ComputedSpendingStats> {
  const { periodStart, periodEnd, priorStart, priorEnd } = getPeriodDateRange(period, refDate);
  const trailing90DaysStart = subDays(refDate, 90);

  // 1. Fetch all user transactions from trailing 90 days + prior period to cover all calculations
  const earliestFetchDate = priorStart < trailing90DaysStart ? priorStart : trailing90DaysStart;

  const snapshot = await adminDb
    .collection(`users/${uid}/transactions`)
    .get();

  const allTransactions: RawTxDoc[] = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    allTransactions.push({
      id: doc.id,
      type: data.type || "expense",
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
  }

  // 2. Current period financial totals
  let totalExpense = 0;
  let totalIncome = 0;
  let discretionarySpend = 0;
  const currentCatSpendMap: Record<string, number> = {};

  for (const tx of currentPeriodTxs) {
    const effectiveAmount = tx.userShare !== undefined ? tx.userShare : tx.amount;
    if (tx.type === "expense") {
      totalExpense += effectiveAmount;
      currentCatSpendMap[tx.category] = (currentCatSpendMap[tx.category] || 0) + effectiveAmount;
      if (isDiscretionary(tx.category)) {
        discretionarySpend += effectiveAmount;
      }
    } else if (tx.type === "income") {
      totalIncome += effectiveAmount;
    }
  }

  // Prior period category spending
  const priorCatSpendMap: Record<string, number> = {};
  for (const tx of priorPeriodTxs) {
    const effectiveAmount = tx.userShare !== undefined ? tx.userShare : tx.amount;
    if (tx.type === "expense") {
      priorCatSpendMap[tx.category] = (priorCatSpendMap[tx.category] || 0) + effectiveAmount;
    }
  }

  // 3. Trailing 90-day baseline stats
  let trailing90Expense = 0;
  let trailing90Income = 0;
  let trailing90Discretionary = 0;
  const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];
  const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

  for (const tx of trailing90DaysTxs) {
    const effectiveAmount = tx.userShare !== undefined ? tx.userShare : tx.amount;
    const txDate = parseTxDate(tx.date);
    if (tx.type === "expense") {
      trailing90Expense += effectiveAmount;
      if (isDiscretionary(tx.category)) {
        trailing90Discretionary += effectiveAmount;
      }
      const dayIndex = txDate.getDay();
      weekdayTotals[dayIndex] += effectiveAmount;
      weekdayCounts[dayIndex] += 1;
    } else if (tx.type === "income") {
      trailing90Income += effectiveAmount;
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

  // 4. Time calculations & Blended Month-End Projection
  const totalDaysInPeriod = Math.max(1, differenceInCalendarDays(periodEnd, periodStart) + 1);
  const rawElapsed = differenceInCalendarDays(refDate, periodStart) + 1;
  const daysElapsed = Math.min(totalDaysInPeriod, Math.max(1, rawElapsed));
  const daysRemaining = Math.max(0, totalDaysInPeriod - daysElapsed);

  const currentDailyAvg = totalExpense / daysElapsed;

  // Blended weighting: early in the period (w close to 0) lean on 90-day baseline; late in period lean on actual pace
  const weight = Math.min(1.0, Math.max(0.0, daysElapsed / totalDaysInPeriod));
  const fallbackDailyBaseline = trailingDailyAvg > 0 ? trailingDailyAvg : currentDailyAvg;
  const blendedDailyRate = weight * currentDailyAvg + (1.0 - weight) * fallbackDailyBaseline;

  const projectedMonthEndExpense = Math.round(totalExpense + daysRemaining * blendedDailyRate);
  const historicalExpectedPeriodExpense = Math.round(fallbackDailyBaseline * totalDaysInPeriod);
  const projectedDiffPercentage =
    historicalExpectedPeriodExpense > 0
      ? Math.round(
          ((projectedMonthEndExpense - historicalExpectedPeriodExpense) /
            historicalExpectedPeriodExpense) *
            100
        )
      : 0;

  // 5. Projection Series for Line Chart (Cumulative Actual vs Projected)
  const projectionSeries: ProjectionPoint[] = [];
  const dailySpendBuckets: number[] = new Array(totalDaysInPeriod).fill(0);

  for (const tx of currentPeriodTxs) {
    if (tx.type === "expense") {
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
      projectionSeries.push({
        day: dayNumber,
        dateStr,
        actualSpend: Math.round(runningActual),
        projectedSpend: Math.round(runningActual),
      });
    } else {
      const projectedStep = runningActual + (dayNumber - daysElapsed) * blendedDailyRate;
      projectionSeries.push({
        day: dayNumber,
        dateStr,
        projectedSpend: Math.round(projectedStep),
      });
    }
  }

  // 6. Day-of-week patterns (90-day baseline)
  const weekdayStats: WeekdayStat[] = [];
  const totalWeekdaySpend = weekdayTotals.reduce((a, b) => a + b, 0);
  const weeklyMeanSpend = totalWeekdaySpend / 7;

  for (let i = 0; i < 7; i++) {
    const total = weekdayTotals[i];
    const count = weekdayCounts[i];
    const avgSpend = count > 0 ? Math.round(total / count) : 0;
    const isOutlierHigh = weeklyMeanSpend > 0 && total > weeklyMeanSpend * 1.3;
    const isOutlierLow = weeklyMeanSpend > 0 && total < weeklyMeanSpend * 0.7 && total > 0;

    weekdayStats.push({
      dayIndex: i,
      dayName: WEEKDAY_NAMES[i],
      totalSpend: Math.round(total),
      avgSpend,
      count,
      isOutlierHigh,
      isOutlierLow,
    });
  }

  // 7. Category deltas
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
        priorSpend,
        changePercent,
        changeAbsolute,
      };
    })
    .filter((cd) => cd.currentSpend > 0 || cd.priorSpend > 0)
    .sort((a, b) => Math.abs(b.changeAbsolute) - Math.abs(a.changeAbsolute));

  // 8. Top Outlier Transactions
  const topOutliers: OutlierTransaction[] = currentPeriodTxs
    .filter((tx) => tx.type === "expense")
    .sort((a, b) => (b.userShare || b.amount) - (a.userShare || a.amount))
    .slice(0, 5)
    .map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: Math.round(tx.userShare !== undefined ? tx.userShare : tx.amount),
      category: tx.category,
      date: format(parseTxDate(tx.date), "yyyy-MM-dd"),
    }));

  // 9. Savings rate & discretionary percentages
  const savingsRate =
    totalIncome > 0
      ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) / 100
      : 0;

  const discretionarySharePercent =
    totalExpense > 0 ? Math.round((discretionarySpend / totalExpense) * 100) : 0;

  return {
    period,
    startDate: format(periodStart, "yyyy-MM-dd"),
    endDate: format(periodEnd, "yyyy-MM-dd"),
    daysElapsed,
    daysRemaining,
    daysInPeriod: totalDaysInPeriod,
    totalExpense: Math.round(totalExpense),
    totalIncome: Math.round(totalIncome),
    savingsRate,
    historicalSavingsRate,
    currentDailyAvg: Math.round(currentDailyAvg),
    trailingDailyAvg: Math.round(trailingDailyAvg),
    projectedMonthEndExpense,
    projectedDiffPercentage,
    projectionSeries,
    weekdayStats,
    categoryDeltas,
    topOutliers,
    discretionarySpend: Math.round(discretionarySpend),
    discretionarySharePercent,
    historicalDiscretionarySharePercent,
  };
}
