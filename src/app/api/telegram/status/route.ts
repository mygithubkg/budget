import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const telegramChatId = userDoc.data()?.telegramChatId;

    if (!telegramChatId) {
      return NextResponse.json({ isLinked: false });
    }

    const linkDoc = await adminDb
      .collection("telegramLinks")
      .doc(String(telegramChatId))
      .get();

    if (!linkDoc.exists) {
      return NextResponse.json({ isLinked: false });
    }

    const linkData = linkDoc.data();
    return NextResponse.json({
      isLinked: true,
      chatId: telegramChatId,
      username: linkData?.username || null,
      firstName: linkData?.firstName || null,
      linkedAt: linkData?.linkedAt?.toDate
        ? linkData.linkedAt.toDate().toISOString()
        : linkData?.linkedAt || null,
    });
  } catch (error: any) {
    console.error("Error checking Telegram link status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check status" },
      { status: 500 }
    );
  }
}
