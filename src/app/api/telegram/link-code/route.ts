import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Generate random alphanumeric 8-char single-use code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes TTL

    await adminDb.collection("linkCodes").doc(code).set({
      code,
      uid,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      used: false,
    });

    const botUsername =
      process.env.TELEGRAM_BOT_USERNAME ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
      "FinChatLedgerBot";

    const deepLink = `https://t.me/${botUsername}?start=${code}`;

    return NextResponse.json({
      code,
      deepLink,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error generating Telegram link code:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate link code" },
      { status: 500 }
    );
  }
}
