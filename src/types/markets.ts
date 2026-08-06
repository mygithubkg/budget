export interface MarketQuote {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  currency?: string;
  high?: number;
  low?: number;
  previousClose?: number;
  unit?: string; // e.g. "USD / oz" or "USD / bbl"
}

export interface MarketIndices {
  nifty50: MarketQuote;
  sensex: MarketQuote;
  nasdaq: MarketQuote;
}

export interface MarketCommodities {
  gold: MarketQuote;
  silver: MarketQuote;
  crudeOil: MarketQuote;
}

export interface MarketDataDoc {
  indices: MarketIndices;
  commodities: MarketCommodities;
  updatedAt?: any;
  updatedAtMs?: number;
}

export interface MarketNewsArticle {
  id: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  snippet?: string;
  imageUrl?: string;
}

export interface MarketNewsDoc {
  articles: MarketNewsArticle[];
  updatedAt?: any;
  updatedAtMs?: number;
}
