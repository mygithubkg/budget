import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Look up invite code
    const inviteDoc = await adminDb.collection("group_invites").doc(cleanCode).get();
    if (!inviteDoc.exists) {
      return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 404 });
    }

    const inviteData = inviteDoc.data()!;
    const groupId = inviteData.groupId;

    const groupRef = adminDb.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return NextResponse.json({ error: "Group no longer exists" }, { status: 404 });
    }

    // Add user to memberUids
    await groupRef.update({
      memberUids: FieldValue.arrayUnion(uid),
    });

    return NextResponse.json({
      success: true,
      groupId,
      groupName: groupDoc.data()?.name,
    });
  } catch (error: any) {
    console.error("POST /api/groups/join error:", error);
    return NextResponse.json({ error: error.message || "Failed to join group" }, { status: 500 });
  }
}
