export type AnalysisPeriod = "week" | "month" | "3months";

export interface WeekdayStat {
  dayIndex: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  dayName: string; // "Sun", "Mon", etc.
  totalSpend: number;
  avgSpend: number;
  count: number;
  isOutlierHigh: boolean; // >30% above weekly mean
  isOutlierLow: boolean; // >30% below weekly mean
}

export interface CategoryDelta {
  category: string;
  currentSpend: number;
  priorSpend: number;
  changePercent: number; // e.g. +25.4 or -12.0
  changeAbsolute: number;
}

export interface OutlierTransaction {
  id?: string;
  description: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
}

export interface ProjectionPoint {
  day: number; // Day of month / period (1, 2, 3...)
  dateStr: string; // YYYY-MM-DD
  actualSpend?: number; // Cumulative actual spend up to today
  projectedSpend: number; // Cumulative projected continuation to end of period
}

export interface ComputedSpendingStats {
  period: AnalysisPeriod;
  startDate: string;
  endDate: string;
  daysElapsed: number;
  daysRemaining: number;
  daysInPeriod: number;
  totalExpense: number;
  totalIncome: number;
  savingsRate: number; // (income - expense) / income
  historicalSavingsRate: number; // 90-day baseline savings rate
  currentDailyAvg: number;
  trailingDailyAvg: number; // 90-day daily average expense
  projectedMonthEndExpense: number; // Blended weighted projection
  projectedDiffPercentage: number; // vs historical monthly average
  projectionSeries: ProjectionPoint[];
  weekdayStats: WeekdayStat[];
  categoryDeltas: CategoryDelta[];
  topOutliers: OutlierTransaction[];
  discretionarySpend: number;
  discretionarySharePercent: number;
  historicalDiscretionarySharePercent: number;
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
