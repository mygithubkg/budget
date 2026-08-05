import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { GroupSplit } from "@/types/group";

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
    const ghostMembers: Array<{ ghostId: string; name: string }> = groupData.ghostMembers || [];

    if (!memberUids.includes(uid)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const {
      description,
      category = "General",
      totalAmount,
      paidBy = uid,
      date = new Date().toISOString(),
      splits: customSplits,
      source = "manual",
    } = body;

    const amountNum = Number(totalAmount);
    if (!description || isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Description and valid positive amount are required" },
        { status: 400 }
      );
    }

    // All available member references
    const allMemberRefs = [
      ...memberUids,
      ...ghostMembers.map((g) => g.ghostId),
    ];

    let finalSplits: GroupSplit[] = [];

    if (Array.isArray(customSplits) && customSplits.length > 0) {
      finalSplits = customSplits.map((s) => ({
        memberRef: s.memberRef,
        amount: Number(s.amount) || 0,
      }));
    } else {
      // Default: Equal split among all group members
      const count = allMemberRefs.length || 1;
      const baseShare = Math.floor((amountNum / count) * 100) / 100;
      let remainder = Math.round((amountNum - baseShare * count) * 100) / 100;

      finalSplits = allMemberRefs.map((mRef, idx) => {
        let memberAmt = baseShare;
        if (remainder > 0) {
          memberAmt = Math.round((memberAmt + 0.01) * 100) / 100;
          remainder = Math.round((remainder - 0.01) * 100) / 100;
        }
        return {
          memberRef: mRef,
          amount: memberAmt,
        };
      });
    }

    const txDate = date ? new Date(date) : new Date();

    const txRef = await adminDb
      .collection("groups")
      .doc(groupId)
      .collection("transactions")
      .add({
        description: description.trim(),
        category: category.trim() || "General",
        totalAmount: amountNum,
        paidBy,
        splits: finalSplits,
        date: Timestamp.fromDate(txDate),
        createdAt: FieldValue.serverTimestamp(),
        source,
      });

    return NextResponse.json({
      success: true,
      transactionId: txRef.id,
    });
  } catch (error: any) {
    console.error("POST group transaction error:", error);
    return NextResponse.json({ error: error.message || "Failed to add transaction" }, { status: 500 });
  }
}
