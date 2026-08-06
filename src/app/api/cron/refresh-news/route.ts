import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";
import { fetchTopMarketNews } from "@/lib/markets/news";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // Optional secret check if CRON_SECRET is configured
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const querySecret = url.searchParams.get("secret");
      if (querySecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
      }
    }

    // Fetch top 3 finance stories
    const newsData = await fetchTopMarketNews();

    // Cache in shared Firestore document system/marketNews
    const docRef = adminDb.collection("system").doc("marketNews");
    await docRef.set({
      articles: newsData.articles,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: newsData.updatedAtMs || Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Market news updated successfully",
      articlesCount: newsData.articles.length,
      updatedAtMs: newsData.updatedAtMs,
    });
  } catch (err: any) {
    console.error("GET /api/cron/refresh-news error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to refresh market news" },
      { status: 500 }
    );
  }
}
