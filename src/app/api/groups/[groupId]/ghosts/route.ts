import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

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
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Ghost member name is required" }, { status: 400 });
    }

    const newGhost = {
      ghostId: `ghost-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
    };

    await adminDb
      .collection("groups")
      .doc(groupId)
      .update({
        ghostMembers: FieldValue.arrayUnion(newGhost),
      });

    return NextResponse.json({
      success: true,
      ghost: newGhost,
    });
  } catch (error: any) {
    console.error("POST ghost member error:", error);
    return NextResponse.json({ error: error.message || "Failed to add member" }, { status: 500 });
  }
}
