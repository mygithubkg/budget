import { MarketNewsArticle, MarketNewsDoc } from "@/types/markets";

const FALLBACK_NEWS: MarketNewsArticle[] = [
  {
    id: "news-fallback-1",
    headline: "Global Central Banks Balance Growth Targets Amid Shifting Inflation Trajectories",
    source: "Bloomberg Markets",
    url: "https://www.bloomberg.com/markets",
    publishedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
    snippet:
      "Policymakers across major economies signal measured adjustments to benchmark rates as resilient labor markets coincide with moderating core inflation prints.",
  },
  {
    id: "news-fallback-2",
    headline: "Indian Equities Hold Steady as Domestic Institutional Inflows Support Benchmarks",
    source: "Economic Times",
    url: "https://economictimes.indiatimes.com/markets",
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2h ago
    snippet:
      "The Nifty 50 and Sensex maintained stable momentum with strong quarterly earnings in banking and consumer sectors underpinning investor sentiment.",
  },
  {
    id: "news-fallback-3",
    headline: "Commodity Markets See Volatility as Energy Futures and Precious Metals Diverge",
    source: "Reuters Financial",
    url: "https://www.reuters.com/markets/commodities/",
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4h ago
    snippet:
      "Gold futures consolidated near key technical resistance while crude benchmarks responded to updated global supply forecasts and shipping route dynamics.",
  },
];

/**
 * Fetch top 3 finance news articles from Marketaux or fallback source
 */
export async function fetchTopMarketNews(): Promise<MarketNewsDoc> {
  const apiToken = process.env.MARKETAUX_API_TOKEN;

  if (apiToken) {
    try {
      const url = new URL("https://api.marketaux.com/v1/news/all");
      url.searchParams.set("language", "en");
      url.searchParams.set("filter_entities", "true");
      url.searchParams.set("limit", "3");
      url.searchParams.set("api_token", apiToken);

      const res = await fetch(url.toString(), {
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          const articles: MarketNewsArticle[] = data.data.slice(0, 3).map((item: any, idx: number) => ({
            id: item.uuid || `marketaux-${idx}`,
            headline: item.title || "Financial News Update",
            source: item.source || "Marketaux",
            url: item.url || "#",
            publishedAt: item.published_at || new Date().toISOString(),
            snippet: item.snippet || item.description || "",
            imageUrl: item.image_url || undefined,
          }));

          return {
            articles,
            updatedAtMs: Date.now(),
          };
        }
      } else {
        console.warn(`[Marketaux] API returned status ${res.status}`);
      }
    } catch (err) {
      console.warn("[Marketaux] Failed to fetch news:", (err as any)?.message || err);
    }
  }

  // Return fallback news if API token is not provided or if request fails
  return {
    articles: FALLBACK_NEWS,
    updatedAtMs: Date.now(),
  };
}
