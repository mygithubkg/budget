import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { computeSpendingStats } from "@/lib/analysis/stats";
import { generateAIAnalysis } from "@/lib/analysis/narrative";
import { AnalysisPeriod } from "@/types/analysis";

const COOLDOWN_MS = 60 * 60 * 1000; // 1-hour rate limit on manual AI regenerations

async function verifyUser(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    console.error("Failed to verify Firebase ID token in /api/analysis:", err);
    return null;
  }
}

/**
 * GET /api/analysis?period=week|month|3months&refresh=true|false
 */
export async function GET(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const periodParam = (url.searchParams.get("period") || "month") as AnalysisPeriod;
    const isRefreshRequested = url.searchParams.get("refresh") === "true";

    const validPeriods: AnalysisPeriod[] = ["week", "month", "3months"];
    const period: AnalysisPeriod = validPeriods.includes(periodParam) ? periodParam : "month";

    // 1. Placeholder check for user pro subscription tier
    const userDocRef = adminDb.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    const isPro = userDoc.exists ? userDoc.data()?.isPro !== false : true; // Default true for all users

    if (!isPro) {
      return NextResponse.json(
        { error: "AI Financial Analysis is a Pro feature." },
        { status: 403 }
      );
    }

    // 2. Check cached analysis in Firestore
    const cacheDocRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("aiAnalysis")
      .doc(`latest_${period}`);

    const cacheSnap = await cacheDocRef.get();
    const now = Date.now();

    if (cacheSnap.exists) {
      const cached = cacheSnap.data();
      const generatedAtMs = cached?.generatedAtMs || 0;
      const ageMs = now - generatedAtMs;

      // If user requested a refresh, check if they are still within the 1-hour cooldown window
      if (isRefreshRequested && ageMs < COOLDOWN_MS) {
        const cooldownRemainingMs = COOLDOWN_MS - ageMs;
        return NextResponse.json({
          stats: cached?.stats,
          narrative: cached?.narrative,
          generatedAt: cached?.generatedAt,
          period,
          isCached: true,
          cooldownRemainingMs,
        });
      }

      // If no refresh requested, return cached version immediately
      if (!isRefreshRequested) {
        return NextResponse.json({
          stats: cached?.stats,
          narrative: cached?.narrative,
          generatedAt: cached?.generatedAt,
          period,
          isCached: true,
        });
      }
    }

    // 3. Compute deterministic statistics
    const stats = await computeSpendingStats(uid, period);

    // 4. Generate AI narrative layer
    const narrative = await generateAIAnalysis(uid, stats, "full");

    const generatedAt = new Date().toISOString();
    const payload = {
      stats,
      narrative,
      generatedAt,
      generatedAtMs: now,
      period,
    };

    // 5. Store in cache
    await cacheDocRef.set(payload, { merge: true });

    return NextResponse.json({
      ...payload,
      isCached: false,
    });
  } catch (err: any) {
    console.error("GET /api/analysis error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate AI analysis" },
      { status: 500 }
    );
  }
}
