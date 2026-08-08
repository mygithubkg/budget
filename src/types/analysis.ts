export type AnalysisPeriod = "week" | "month" | "3months";

export interface WeekdayStat {
  dayIndex: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  dayName: string; // "Sun", "Mon", etc.
  totalSpend: number;
  totalSpendFormatted: string;
  avgSpend: number;
  avgSpendFormatted: string;
  count: number; // Number of distinct occurrences in trailing baseline
  confidenceMet: boolean; // True if count >= 3 (meets threshold to be an established habit)
  isOutlierHigh: boolean; // >30% above weekly mean with confidenceMet
  isOutlierLow: boolean; // >30% below weekly mean with confidenceMet
}

export interface CategoryDelta {
  category: string;
  currentSpend: number;
  currentSpendFormatted: string;
  priorSpend: number;
  priorSpendFormatted: string;
  changePercent: number; // e.g. +25.4 or -12.0
  changeAbsolute: number;
  changeAbsoluteFormatted: string;
}

export interface OutlierTransaction {
  id?: string;
  description: string;
  amount: number;
  amountFormatted: string;
  category: string;
  date: string; // YYYY-MM-DD
}

export interface ExpectedRecurringItem {
  description: string;
  category: string;
  expectedAmount: number;
  expectedAmountFormatted: string;
  lastSeenDate: string; // YYYY-MM-DD
  frequencyDays: number;
  occurrencesCount: number;
}

export interface ProjectionPoint {
  day: number; // Day of month / period (1, 2, 3...)
  dateStr: string; // YYYY-MM-DD
  actualSpend?: number; // Cumulative actual spend up to today
  actualSpendFormatted?: string;
  projectedSpend: number; // Cumulative projected continuation to end of period
  projectedSpendFormatted: string;
}

export interface ComputedSpendingStats {
  period: AnalysisPeriod;
  userCurrency: string;
  startDate: string;
  endDate: string;
  daysElapsed: number;
  daysRemaining: number;
  daysInPeriod: number;
  isEarlyEstimate: boolean;

  // Genuine spending metrics (transfers excluded)
  totalExpense: number;
  totalExpenseFormatted: string;
  totalIncome: number;
  totalIncomeFormatted: string;
  savingsRate: number; // (income - expense) / income
  savingsRatePercentFormatted: string;
  historicalSavingsRate: number; // 90-day baseline savings rate
  historicalSavingsRatePercentFormatted: string;

  // Daily pacing
  currentDailyAvg: number;
  currentDailyAvgFormatted: string;
  trailingDailyAvg: number; // 90-day daily average expense (outliers & transfers excluded)
  trailingDailyAvgFormatted: string;

  // Projections
  paceProjection: number; // Outlier-adjusted pace baseline extrapolation
  paceProjectionFormatted: string;
  recurringNotYetOccurredTotal: number; // Expected recurring items not yet posted
  recurringNotYetOccurredTotalFormatted: string;
  expectedRecurringItems: ExpectedRecurringItem[];
  projectedMonthEndExpense: number; // paceProjection + recurringNotYetOccurredTotal
  projectedMonthEndExpenseFormatted: string;
  projectedDiffPercentage: number; // vs historical monthly average

  // Visual series & breakdowns
  projectionSeries: ProjectionPoint[];
  weekdayStats: WeekdayStat[];
  categoryDeltas: CategoryDelta[];
  topOutliers: OutlierTransaction[];
  outliersExcludedCount: number;

  // Discretionary allocations
  discretionarySpend: number;
  discretionarySpendFormatted: string;
  discretionarySharePercent: number;
  historicalDiscretionarySharePercent: number;

  // Transfers & Savings transparency (excluded from spending pace)
  transfersTotal: number;
  transfersTotalFormatted: string;
  transfersCount: number;
}

export interface AIPatternItem {
  title: string;
  narrative: string;
}

export interface AIOpportunityItem {
  title: string;
  narrative: string;
  category: string | null;
}

export interface AIAnalysisResult {
  summary: string;
  projection: {
    narrative: string;
    projectedTotal: number;
    projectedTotalFormatted?: string;
    comparedToAverage: string;
  };
  patterns: AIPatternItem[];
  opportunities: AIOpportunityItem[];
}

export interface FullAnalysisPayload {
  stats: ComputedSpendingStats;
  narrative: AIAnalysisResult;
  generatedAt: string | number;
  period: AnalysisPeriod;
  isCached?: boolean;
  cooldownRemainingMs?: number;
}
