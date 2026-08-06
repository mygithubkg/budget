"use client";

import React, { useMemo } from "react";
import { useMarkets } from "@/hooks/useMarkets";
import { MarketQuote, MarketNewsArticle } from "@/types/markets";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ExternalLink,
  Clock,
  Landmark,
  Coins,
  Newspaper,
  Info,
  Globe2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

/**
 * Format index / commodity numbers with appropriate currency symbols and decimals
 */
function formatMarketValue(val: number, currency: string = "USD"): string {
  if (typeof val !== "number" || isNaN(val)) return "—";

  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

/**
 * Format change values (e.g. +125.40 (+0.52%))
 */
function formatChange(change: number, changePercent: number, currency: string = "USD") {
  const isPositive = change >= 0;
  const sign = isPositive ? "+" : "−";
  const absChange = Math.abs(change);
  const absPercent = Math.abs(changePercent);

  const formattedAbs =
    currency === "INR"
      ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(absChange)
      : new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(absChange);

  return {
    isPositive,
    sign,
    text: `${sign}${formattedAbs} (${sign}${absPercent.toFixed(2)}%)`,
  };
}

/**
 * Compute whether Indian (NSE/BSE) and US (NASDAQ) markets are currently open
 */
function getMarketSessions() {
  const now = new Date();
  const utcDay = now.getUTCDay(); // 0 is Sunday, 6 is Saturday
  const isWeekend = utcDay === 0 || utcDay === 6;

  // Indian Market: IST = UTC + 5:30. Market hours: 09:15 to 15:30 IST
  // In UTC: 03:45 UTC to 10:00 UTC
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const isIndiaOpen = !isWeekend && utcHours >= 3.75 && utcHours <= 10.0;

  // US Market: EST = UTC - 5 (or UTC - 4 EDT). Market hours: 09:30 to 16:00 EST
  // In UTC (approx EDT): 13:30 UTC to 20:00 UTC
  const isUsOpen = !isWeekend && utcHours >= 13.5 && utcHours <= 20.0;

  return {
    isIndiaOpen,
    isUsOpen,
  };
}

interface QuoteCardProps {
  quote: MarketQuote;
  icon?: React.ReactNode;
}

function QuoteCard({ quote, icon }: QuoteCardProps) {
  const { isPositive, sign } = formatChange(quote.change, quote.changePercent, quote.currency);
  const currencySymbol = quote.currency === "INR" ? "₹" : "$";

  return (
    <div className="relative rounded-2xl border border-fiber-line bg-card-bg p-4 sm:p-5 shadow-card dark:shadow-none dark:border-white/[0.06] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden">
      {/* Accent left indicator rule */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{
          backgroundColor: isPositive ? "var(--thrive-green)" : "var(--stamp-red)",
        }}
      />

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="font-display text-sm sm:text-base font-bold text-ink-text leading-tight">
              {quote.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[10px] text-muted-text uppercase px-1.5 py-0.5 rounded border border-fiber-line bg-paper-bg">
                {quote.symbol}
              </span>
              {quote.unit && (
                <span className="font-mono text-[10px] text-muted-text">
                  {quote.unit}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Up/Down Directional Badge */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold border ${
            isPositive
              ? "text-thrive-green bg-thrive-green/10 border-thrive-green/20"
              : "text-stamp-red bg-stamp-red/10 border-stamp-red/20"
          }`}
        >
          {isPositive ? (
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {sign}
            {Math.abs(quote.changePercent).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Main Quote Price */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
          {formatMarketValue(quote.value, quote.currency)}
        </span>

        <span
          className={`font-mono text-xs font-semibold ${
            isPositive ? "text-thrive-green" : "text-stamp-red"
          }`}
        >
          {sign}
          {currencySymbol}
          {Math.abs(quote.change).toFixed(2)}
        </span>
      </div>

      {/* Micro stats: Day Range (Low - High) */}
      {(quote.high !== undefined || quote.low !== undefined) && (
        <div className="mt-3 pt-2.5 border-t border-fiber-line/60 flex items-center justify-between text-[11px] font-mono text-muted-text">
          <span>
            L: {quote.low !== undefined ? formatMarketValue(quote.low, quote.currency) : "—"}
          </span>
          <span>
            H: {quote.high !== undefined ? formatMarketValue(quote.high, quote.currency) : "—"}
          </span>
        </div>
      )}
    </div>
  );
}

function NewsCard({ article }: { article: MarketNewsArticle }) {
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true });
    } catch {
      return "recently";
    }
  }, [article.publishedAt]);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col justify-between rounded-2xl border border-fiber-line bg-card-bg p-4 sm:p-5 shadow-card dark:shadow-none dark:border-white/[0.06] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-stamp-red/30"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stamp-red bg-stamp-red/10 border border-stamp-red/20 px-2 py-0.5 rounded">
            {article.source}
          </span>
          <div className="flex items-center gap-1 text-[11px] font-mono text-muted-text">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>
        </div>

        <h4 className="font-display text-sm sm:text-base font-bold text-ink-text group-hover:text-stamp-red transition-colors leading-snug line-clamp-2">
          {article.headline}
        </h4>

        {article.snippet && (
          <p className="mt-2 text-xs font-sans text-muted-text line-clamp-3 leading-relaxed">
            {article.snippet}
          </p>
        )}
      </div>

      <div className="mt-4 pt-2.5 border-t border-fiber-line/60 flex items-center justify-between text-xs font-mono font-medium text-muted-text group-hover:text-stamp-red transition-colors">
        <span>Read full coverage</span>
        <ExternalLink className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </a>
  );
}

export function MarketsView() {
  const { marketData, marketNews, isLoading, isRefreshing, refresh } = useMarkets();
  const sessions = useMemo(() => getMarketSessions(), []);

  const handleManualRefresh = async () => {
    try {
      await refresh();
      toast.success("Market quotes refreshed");
    } catch {
      toast.error("Failed to refresh market quotes");
    }
  };

  const updatedTimeAgo = useMemo(() => {
    const timestamp = marketData?.updatedAtMs || Date.now();
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "just now";
    }
  }, [marketData?.updatedAtMs]);

  if (isLoading && !marketData) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-10 w-64 bg-fiber-line/50 rounded-xl" />

        {/* Indices Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-40 bg-fiber-line/30 rounded-2xl" />
          <div className="h-40 bg-fiber-line/30 rounded-2xl" />
          <div className="h-40 bg-fiber-line/30 rounded-2xl" />
        </div>

        {/* Commodities Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-40 bg-fiber-line/30 rounded-2xl" />
          <div className="h-40 bg-fiber-line/30 rounded-2xl" />
          <div className="h-40 bg-fiber-line/30 rounded-2xl" />
        </div>

        {/* News Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-48 bg-fiber-line/30 rounded-2xl" />
          <div className="h-48 bg-fiber-line/30 rounded-2xl" />
          <div className="h-48 bg-fiber-line/30 rounded-2xl" />
        </div>
      </div>
    );
  }

  const indices = marketData?.indices;
  const commodities = marketData?.commodities;
  const articles = marketNews?.articles || [];

  return (
    <div className="space-y-6">
      {/* Top Status & Freshness Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card-bg p-4 sm:p-5 rounded-2xl border border-fiber-line shadow-card dark:shadow-none dark:border-white/[0.06]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-stamp-red" />
            <h2 className="font-display text-base sm:text-lg font-bold text-ink-text">
              Global Markets &amp; Commodities
            </h2>
          </div>
          <p className="text-xs font-sans text-muted-text">
            Major indices and commodity futures refreshed during active market hours
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Market Status Indicators */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border ${
                sessions.isIndiaOpen
                  ? "bg-thrive-green/10 text-thrive-green border-thrive-green/30"
                  : "bg-paper-bg text-muted-text border-fiber-line"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  sessions.isIndiaOpen ? "bg-thrive-green animate-pulse" : "bg-muted-text"
                }`}
              />
              NSE/BSE {sessions.isIndiaOpen ? "Open" : "Closed"}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border ${
                sessions.isUsOpen
                  ? "bg-thrive-green/10 text-thrive-green border-thrive-green/30"
                  : "bg-paper-bg text-muted-text border-fiber-line"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  sessions.isUsOpen ? "bg-thrive-green animate-pulse" : "bg-muted-text"
                }`}
              />
              US {sessions.isUsOpen ? "Open" : "Closed"}
            </span>
          </div>

          {/* Freshness Badge & Refresh Button */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-fiber-line">
            <span className="text-[11px] font-mono text-muted-text">
              Updated {updatedTimeAgo}
            </span>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg border border-fiber-line hover:border-stamp-red/40 hover:bg-paper-bg text-muted-text hover:text-stamp-red transition-all disabled:opacity-50"
              title="Refresh quotes"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-stamp-red" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 1: Major Market Indices ── */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Landmark className="h-4 w-4 text-stamp-red" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-text">
            Key Equity Indices
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {indices?.nifty50 && (
            <QuoteCard
              quote={indices.nifty50}
              icon={<div className="h-2 w-2 rounded-full bg-stamp-red" />}
            />
          )}
          {indices?.sensex && (
            <QuoteCard
              quote={indices.sensex}
              icon={<div className="h-2 w-2 rounded-full bg-thrive-green" />}
            />
          )}
          {indices?.nasdaq && (
            <QuoteCard
              quote={indices.nasdaq}
              icon={<div className="h-2 w-2 rounded-full bg-blue-500" />}
            />
          )}
        </div>
      </div>

      {/* ── Section 2: Commodity Futures ── */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Coins className="h-4 w-4 text-stamp-red" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-text">
            Commodity Futures
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {commodities?.gold && (
            <QuoteCard
              quote={commodities.gold}
              icon={<div className="h-2 w-2 rounded-full bg-amber-400" />}
            />
          )}
          {commodities?.silver && (
            <QuoteCard
              quote={commodities.silver}
              icon={<div className="h-2 w-2 rounded-full bg-slate-300" />}
            />
          )}
          {commodities?.crudeOil && (
            <QuoteCard
              quote={commodities.crudeOil}
              icon={<div className="h-2 w-2 rounded-full bg-orange-600" />}
            />
          )}
        </div>
      </div>

      {/* ── Section 3: Top 3 Finance News Stories ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-stamp-red" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-text">
              Top Finance Stories
            </h3>
          </div>
          <span className="text-[11px] font-mono text-muted-text">
            Powered by Marketaux
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} />
          ))}
        </div>
      </div>

      {/* ── Informational Disclaimer ── */}
      <div className="flex items-start gap-2.5 rounded-xl border border-fiber-line/70 bg-card-bg/60 p-3.5 text-[11px] font-mono text-muted-text">
        <Info className="h-4 w-4 shrink-0 text-muted-text/80 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-ink-text font-bold">Informational Notice:</strong> Market indices and commodity quotes are delayed by at least 15 minutes and aggregated from free public market endpoints. All information and news content are provided solely for personal convenience and budgeting context, not as financial or investment advice.
        </p>
      </div>
    </div>
  );
}
