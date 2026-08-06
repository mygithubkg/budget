import yahooFinance from "yahoo-finance2";
import { MarketDataDoc, MarketQuote } from "@/types/markets";

// Defined Tickers
export const MARKET_TICKERS = {
  indices: {
    nifty50: { symbol: "^NSEI", name: "Nifty 50", currency: "INR" },
    sensex: { symbol: "^BSESN", name: "Sensex", currency: "INR" },
    nasdaq: { symbol: "^IXIC", name: "NASDAQ Composite", currency: "USD" },
  },
  commodities: {
    gold: { symbol: "GC=F", name: "Gold Futures", currency: "USD", unit: "USD / oz" },
    silver: { symbol: "SI=F", name: "Silver Futures", currency: "USD", unit: "USD / oz" },
    crudeOil: { symbol: "CL=F", name: "WTI Crude Oil", currency: "USD", unit: "USD / bbl" },
  },
};

// Fallback baseline quotes if offline or API is momentarily unreachable
const FALLBACK_QUOTES: {
  indices: Record<string, MarketQuote>;
  commodities: Record<string, MarketQuote>;
} = {
  indices: {
    nifty50: {
      symbol: "^NSEI",
      name: "Nifty 50",
      value: 24320.5,
      change: 135.2,
      changePercent: 0.56,
      currency: "INR",
      high: 24390.0,
      low: 24210.0,
      previousClose: 24185.3,
    },
    sensex: {
      symbol: "^BSESN",
      name: "Sensex",
      value: 79880.4,
      change: 410.6,
      changePercent: 0.52,
      currency: "INR",
      high: 80120.0,
      low: 79650.0,
      previousClose: 79469.8,
    },
    nasdaq: {
      symbol: "^IXIC",
      name: "NASDAQ Composite",
      value: 17820.3,
      change: -55.4,
      changePercent: -0.31,
      currency: "USD",
      high: 17910.0,
      low: 17760.0,
      previousClose: 17875.7,
    },
  },
  commodities: {
    gold: {
      symbol: "GC=F",
      name: "Gold Futures",
      value: 2415.8,
      change: 12.4,
      changePercent: 0.52,
      currency: "USD",
      unit: "USD / oz",
      high: 2428.0,
      low: 2402.0,
      previousClose: 2403.4,
    },
    silver: {
      symbol: "SI=F",
      name: "Silver Futures",
      value: 28.65,
      change: -0.18,
      changePercent: -0.62,
      currency: "USD",
      unit: "USD / oz",
      high: 29.1,
      low: 28.4,
      previousClose: 28.83,
    },
    crudeOil: {
      symbol: "CL=F",
      name: "WTI Crude Oil",
      value: 76.95,
      change: 0.85,
      changePercent: 1.12,
      currency: "USD",
      unit: "USD / bbl",
      high: 77.6,
      low: 75.8,
      previousClose: 76.1,
    },
  },
};

/**
 * Fetch a single quote safely from Yahoo Finance
 */
async function fetchSafeQuote(
  symbol: string,
  name: string,
  currency: string,
  unit?: string,
  fallback?: MarketQuote
): Promise<MarketQuote> {
  try {
    const quote: any = await yahooFinance.quote(symbol, {
      fields: [
        "regularMarketPrice",
        "regularMarketChange",
        "regularMarketChangePercent",
        "regularMarketDayHigh",
        "regularMarketDayLow",
        "regularMarketPreviousClose",
        "currency",
      ],
    });

    if (quote && typeof quote.regularMarketPrice === "number") {
      return {
        symbol,
        name,
        value: quote.regularMarketPrice,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
        currency: quote.currency || currency,
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        previousClose: quote.regularMarketPreviousClose,
        unit,
      };
    }
  } catch (err) {
    console.warn(`[YahooFinance] Failed to fetch quote for ${symbol}:`, (err as any)?.message || err);
  }

  return fallback || {
    symbol,
    name,
    value: 0,
    change: 0,
    changePercent: 0,
    currency,
    unit,
  };
}

/**
 * Fetch all required market quotes (Indices & Commodities) in parallel
 */
export async function fetchAllMarketQuotes(): Promise<MarketDataDoc> {
  const [
    nifty50,
    sensex,
    nasdaq,
    gold,
    silver,
    crudeOil,
  ] = await Promise.all([
    fetchSafeQuote(
      MARKET_TICKERS.indices.nifty50.symbol,
      MARKET_TICKERS.indices.nifty50.name,
      MARKET_TICKERS.indices.nifty50.currency,
      undefined,
      FALLBACK_QUOTES.indices.nifty50
    ),
    fetchSafeQuote(
      MARKET_TICKERS.indices.sensex.symbol,
      MARKET_TICKERS.indices.sensex.name,
      MARKET_TICKERS.indices.sensex.currency,
      undefined,
      FALLBACK_QUOTES.indices.sensex
    ),
    fetchSafeQuote(
      MARKET_TICKERS.indices.nasdaq.symbol,
      MARKET_TICKERS.indices.nasdaq.name,
      MARKET_TICKERS.indices.nasdaq.currency,
      undefined,
      FALLBACK_QUOTES.indices.nasdaq
    ),
    fetchSafeQuote(
      MARKET_TICKERS.commodities.gold.symbol,
      MARKET_TICKERS.commodities.gold.name,
      MARKET_TICKERS.commodities.gold.currency,
      MARKET_TICKERS.commodities.gold.unit,
      FALLBACK_QUOTES.commodities.gold
    ),
    fetchSafeQuote(
      MARKET_TICKERS.commodities.silver.symbol,
      MARKET_TICKERS.commodities.silver.name,
      MARKET_TICKERS.commodities.silver.currency,
      MARKET_TICKERS.commodities.silver.unit,
      FALLBACK_QUOTES.commodities.silver
    ),
    fetchSafeQuote(
      MARKET_TICKERS.commodities.crudeOil.symbol,
      MARKET_TICKERS.commodities.crudeOil.name,
      MARKET_TICKERS.commodities.crudeOil.currency,
      MARKET_TICKERS.commodities.crudeOil.unit,
      FALLBACK_QUOTES.commodities.crudeOil
    ),
  ]);

  return {
    indices: {
      nifty50,
      sensex,
      nasdaq,
    },
    commodities: {
      gold,
      silver,
      crudeOil,
    },
    updatedAtMs: Date.now(),
  };
}
