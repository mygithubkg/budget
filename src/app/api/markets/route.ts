import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";
import { fetchAllMarketQuotes } from "@/lib/markets/yahoo";
import { fetchTopMarketNews } from "@/lib/markets/news";
import { MarketDataDoc, MarketNewsDoc } from "@/types/markets";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    let marketData: MarketDataDoc | null = null;
    let marketNews: MarketNewsDoc | null = null;

    if (!forceRefresh) {
      try {
        const [marketDocSnap, newsDocSnap] = await Promise.all([
          adminDb.collection("system").doc("marketData").get(),
          adminDb.collection("system").doc("marketNews").get(),
        ]);

        if (marketDocSnap.exists) {
          const data = marketDocSnap.data();
          marketData = {
            indices: data?.indices,
            commodities: data?.commodities,
            updatedAt: data?.updatedAt,
            updatedAtMs: data?.updatedAtMs || (data?.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now()),
          };
        }

        if (newsDocSnap.exists) {
          const data = newsDocSnap.data();
          marketNews = {
            articles: data?.articles || [],
            updatedAt: data?.updatedAt,
            updatedAtMs: data?.updatedAtMs || (data?.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now()),
          };
        }
      } catch (readErr) {
        console.warn("[Markets API] Failed to read cached documents from Firestore:", readErr);
      }
    }

    // If market data is missing or force refreshed, fetch and save
    if (!marketData || forceRefresh) {
      marketData = await fetchAllMarketQuotes();
      try {
        await adminDb.collection("system").doc("marketData").set({
          indices: marketData.indices,
          commodities: marketData.commodities,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: marketData.updatedAtMs || Date.now(),
        });
      } catch (writeErr) {
        console.warn("[Markets API] Failed to cache marketData in Firestore:", writeErr);
      }
    }

    // If news is missing or force refreshed, fetch and save
    if (!marketNews || forceRefresh) {
      marketNews = await fetchTopMarketNews();
      try {
        await adminDb.collection("system").doc("marketNews").set({
          articles: marketNews.articles,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: marketNews.updatedAtMs || Date.now(),
        });
      } catch (writeErr) {
        console.warn("[Markets API] Failed to cache marketNews in Firestore:", writeErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        marketData,
        marketNews,
      },
    });
  } catch (err: any) {
    console.error("GET /api/markets error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load market data" },
      { status: 500 }
    );
  }
}
