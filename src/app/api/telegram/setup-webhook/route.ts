import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { setTelegramWebhook } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(idToken);

    const body = await req.json().catch(() => ({}));
    const origin = body.origin || req.nextUrl.origin;
    const webhookUrl = `${origin}/api/telegram/webhook`;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

    const result = await setTelegramWebhook(webhookUrl, secret);
    return NextResponse.json({
      webhookUrl,
      result,
    });
  } catch (error: any) {
    console.error("Error setting up Telegram webhook:", error);
    return NextResponse.json(
      { error: error.message || "Failed to set up webhook" },
      { status: 500 }
    );
  }
}
