import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { sendTelegramMessage } from "@/lib/telegram/bot";

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

    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();
    const telegramChatId = userDoc.data()?.telegramChatId;

    if (telegramChatId) {
      await adminDb.collection("telegramLinks").doc(String(telegramChatId)).delete();
      await userRef.update({ telegramChatId: null });

      // Notify Telegram user that account was unlinked
      try {
        await sendTelegramMessage(
          telegramChatId,
          "ℹ️ <b>Account Disconnected</b>\n\nYour Telegram chat has been unlinked from your FinChat account from the web settings."
        );
      } catch (notifyErr) {
        console.warn("Could not notify unlinked Telegram chat:", notifyErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error unlinking Telegram account:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unlink" },
      { status: 500 }
    );
  }
}
