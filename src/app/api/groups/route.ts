import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { Group } from "@/types/group";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const snap = await adminDb
      .collection("groups")
      .where("memberUids", "array-contains", uid)
      .get();

    const groups: Group[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Untitled Group",
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        memberUids: data.memberUids || [],
        ghostMembers: data.ghostMembers || [],
      };
    });

    return NextResponse.json({ groups });
  } catch (error: any) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch groups" }, { status: 500 });
  }
}

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
    const { name, ghostNames = [] } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const ghostMembers = (Array.isArray(ghostNames) ? ghostNames : [])
      .filter((n: any) => typeof n === "string" && n.trim())
      .map((n: string) => ({
        ghostId: `ghost-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: n.trim(),
      }));

    const groupRef = adminDb.collection("groups").doc();
    const groupId = groupRef.id;

    // Generate unique 6-character uppercase invite code
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const newGroup = {
      name: name.trim(),
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      memberUids: [uid],
      ghostMembers,
      inviteCode,
    };

    await groupRef.set(newGroup);

    // Save invite lookup
    await adminDb.collection("group_invites").doc(inviteCode).set({
      code: inviteCode,
      groupId,
      groupName: name.trim(),
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      group: {
        id: groupId,
        name: name.trim(),
        createdBy: uid,
        createdAt: new Date().toISOString(),
        memberUids: [uid],
        ghostMembers,
        inviteCode,
      },
    });
  } catch (error: any) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json({ error: error.message || "Failed to create group" }, { status: 500 });
  }
}
