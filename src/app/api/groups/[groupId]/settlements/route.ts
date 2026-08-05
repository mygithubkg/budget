import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const { groupId } = params;

    const groupDoc = await adminDb.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const groupData = groupDoc.data()!;
    const memberUids: string[] = groupData.memberUids || [];

    if (!memberUids.includes(uid)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { fromMemberRef, toMemberRef, amount, date = new Date().toISOString() } = body;

    const amountNum = Number(amount);
    if (!fromMemberRef || !toMemberRef || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Sender, receiver, and positive amount are required" },
        { status: 400 }
      );
    }

    const settleDate = date ? new Date(date) : new Date();

    const settleRef = await adminDb
      .collection("groups")
      .doc(groupId)
      .collection("settlements")
      .add({
        fromMemberRef,
        toMemberRef,
        amount: amountNum,
        date: Timestamp.fromDate(settleDate),
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      settlementId: settleRef.id,
    });
  } catch (error: any) {
    console.error("POST group settlement error:", error);
    return NextResponse.json({ error: error.message || "Failed to record settlement" }, { status: 500 });
  }
}
