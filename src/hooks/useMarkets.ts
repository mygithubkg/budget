"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { MarketDataDoc, MarketNewsDoc } from "@/types/markets";

interface MarketsResult {
  marketData: MarketDataDoc | null;
  marketNews: MarketNewsDoc | null;
}

export function useMarkets() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<MarketsResult>({
    queryKey: ["markets-overview"],
    queryFn: async (): Promise<MarketsResult> => {
      let marketData: MarketDataDoc | null = null;
      let marketNews: MarketNewsDoc | null = null;

      // 1. Try reading directly from cached Firestore documents
      try {
        const [marketDocSnap, newsDocSnap] = await Promise.all([
          getDoc(doc(db, "system", "marketData")),
          getDoc(doc(db, "system", "marketNews")),
        ]);

        if (marketDocSnap.exists()) {
          const raw = marketDocSnap.data();
          marketData = {
            indices: raw.indices,
            commodities: raw.commodities,
            updatedAt: raw.updatedAt,
            updatedAtMs: raw.updatedAtMs || (raw.updatedAt?.toMillis ? raw.updatedAt.toMillis() : Date.now()),
          };
        }

        if (newsDocSnap.exists()) {
          const raw = newsDocSnap.data();
          marketNews = {
            articles: raw.articles || [],
            updatedAt: raw.updatedAt,
            updatedAtMs: raw.updatedAtMs || (raw.updatedAt?.toMillis ? raw.updatedAt.toMillis() : Date.now()),
          };
        }
      } catch (firestoreErr) {
        console.warn("[useMarkets] Firestore direct read error, falling back to API:", firestoreErr);
      }

      // 2. If either document is not found, fallback to API route
      if (!marketData || !marketNews) {
        const res = await fetch("/api/markets");
        if (!res.ok) {
          throw new Error("Failed to fetch market data from API");
        }
        const json = await res.json();
        if (json.data) {
          marketData = json.data.marketData;
          marketNews = json.data.marketNews;
        }
      }

      return {
        marketData,
        marketNews,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
    refetchOnWindowFocus: false,
  });

  // Manual refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/markets?refresh=true");
      if (!res.ok) {
        throw new Error("Failed to refresh market data");
      }
      const json = await res.json();
      return json.data;
    },
    onSuccess: (newData) => {
      if (newData) {
        queryClient.setQueryData(["markets-overview"], {
          marketData: newData.marketData,
          marketNews: newData.marketNews,
        });
      }
    },
  });

  return {
    marketData: data?.marketData || null,
    marketNews: data?.marketNews || null,
    isLoading,
    isError,
    error,
    refetch,
    refresh: refreshMutation.mutateAsync,
    isRefreshing: refreshMutation.isPending,
  };
}
