import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";
import { fetchAllMarketQuotes } from "@/lib/markets/yahoo";

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

    // Fetch quotes from Yahoo Finance
    const marketData = await fetchAllMarketQuotes();

    // Cache in shared Firestore document system/marketData
    const docRef = adminDb.collection("system").doc("marketData");
    await docRef.set({
      indices: marketData.indices,
      commodities: marketData.commodities,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: marketData.updatedAtMs || Date.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Market data updated successfully",
      updatedAtMs: marketData.updatedAtMs,
    });
  } catch (err: any) {
    console.error("GET /api/cron/refresh-markets error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to refresh market data" },
      { status: 500 }
    );
  }
}
