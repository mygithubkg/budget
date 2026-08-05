import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";
import { computeSpendingStats } from "@/lib/analysis/stats";
import { generateAIAnalysis } from "@/lib/analysis/narrative";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const periodParam = url.searchParams.get("period") || "weekly";
    const period = periodParam === "monthly" ? "monthly" : "weekly";
    const analysisPeriod = period === "monthly" ? "month" : "week";

    // Optional secret check if CRON_SECRET is configured
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const querySecret = url.searchParams.get("secret");
      if (querySecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
      }
    }

    const usersSnapshot = await adminDb.collection("users").get();
    const results = {
      period,
      totalUsers: usersSnapshot.size,
      processed: 0,
      telegramSent: 0,
      errors: 0,
    };

    const isoDateStr = format(new Date(), "yyyy-MM-dd");

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;

      // Check future paywall gate placeholder
      if (userData.isPro === false) {
        continue;
      }

      try {
        const userCurrency = userData.currency || "INR";
        const stats = await computeSpendingStats(uid, analysisPeriod);

        // Generate recap narrative
        const narrative = await generateAIAnalysis(uid, stats, "recap");

        // 1. In-app Chat Delivery: Save as special assistant message
        const chatDocRef = adminDb.collection(`users/${uid}/chatMessages`).doc();
        await chatDocRef.set({
          id: chatDocRef.id,
          role: "assistant",
          content: narrative.summary,
          messageType: "recap",
          status: "confirmed",
          recapData: {
            period,
            projection: narrative.projection,
            patterns: narrative.patterns,
            opportunities: narrative.opportunities,
            stats: {
              totalExpense: stats.totalExpense,
              totalIncome: stats.totalIncome,
              savingsRate: stats.savingsRate,
              projectedMonthEndExpense: stats.projectedMonthEndExpense,
              projectedDiffPercentage: stats.projectedDiffPercentage,
            },
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Persist recap for 30 days
        });

        // 2. Telegram Delivery: Send to linked telegram chat if active
        if (userData.telegramChatId) {
          const titlePeriod = period === "monthly" ? "Monthly" : "Weekly";
          const patternSnippet = narrative.patterns[0]
            ? `\n💡 <b>${narrative.patterns[0].title}:</b> ${narrative.patterns[0].narrative}`
            : "";
          const opportunitySnippet = narrative.opportunities[0]
            ? `\n🔍 <b>${narrative.opportunities[0].title}:</b> ${narrative.opportunities[0].narrative}`
            : "";

          const telegramHtml = `📊 <b>FinChat ${titlePeriod} Ledger Recap</b>\n\n${narrative.summary}\n\n📈 <b>Pace & Projection</b>\n• <b>Total Spent:</b> ${formatCurrency(stats.totalExpense, userCurrency)}\n• <b>Projected:</b> ${formatCurrency(narrative.projection.projectedTotal, userCurrency)} (<i>${narrative.projection.comparedToAverage}</i>)${patternSnippet}${opportunitySnippet}\n\n<i>Open FinChat Analysis for full interactive charts.</i>`;

          await sendTelegramMessage(userData.telegramChatId, telegramHtml, {
            parseMode: "HTML",
          });
          results.telegramSent++;
        }

        // 3. Cache recap result for history & quick loading
        const cacheDocRef = adminDb
          .collection(`users/${uid}/aiAnalysis`)
          .doc(`${period}_${isoDateStr}`);

        await cacheDocRef.set({
          stats,
          narrative,
          period,
          generatedAt: new Date().toISOString(),
          generatedAtMs: Date.now(),
        });

        // Update latest cache as well
        await adminDb
          .collection(`users/${uid}/aiAnalysis`)
          .doc(`latest_${analysisPeriod}`)
          .set({
            stats,
            narrative,
            period: analysisPeriod,
            generatedAt: new Date().toISOString(),
            generatedAtMs: Date.now(),
          }, { merge: true });

        results.processed++;
      } catch (userErr) {
        console.error(`Error processing recap for user ${uid}:`, userErr);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (err: any) {
    console.error("GET /api/cron/generate-recaps error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to run cron recap generator" },
      { status: 500 }
    );
  }
}
