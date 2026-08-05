import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getRawAICompletion, BYOKError } from "@/lib/ai/aiProvider";
import { GroupMemberInfo } from "@/types/group";
import { format } from "date-fns";

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
    const ghostMembers = groupData.ghostMembers || [];

    if (!memberUids.includes(uid)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Resolve member names
    const members: GroupMemberInfo[] = [];
    for (const mUid of memberUids) {
      try {
        const uDoc = await adminDb.collection("users").doc(mUid).get();
        const dName = uDoc.exists ? uDoc.data()?.displayName : null;
        members.push({
          id: mUid,
          name: dName || (mUid === uid ? "You" : `User ${mUid.slice(0, 4)}`),
          isGhost: false,
        });
      } catch {
        members.push({ id: mUid, name: mUid === uid ? "You" : "Member", isGhost: false });
      }
    }
    for (const gm of ghostMembers) {
      members.push({ id: gm.ghostId, name: gm.name, isGhost: true });
    }

    const membersListing = members
      .map((m) => `id: "${m.id}", name: "${m.name}"${m.id === uid ? " (Current User)" : ""}`)
      .join("\n");

    const systemPrompt = `You are an AI assistant for a group trip expense ledger.
Current group members:
${membersListing}

The current user typing this message has id: "${uid}".
Extract the expense details from the message into valid JSON:
{
  "description": string,
  "totalAmount": number,
  "category": string,
  "paidById": string, // must match one of the member IDs listed above
  "splitMemberIds": string[] // list of member IDs who share this expense. If split equally among everyone, include all member IDs.
}
Return ONLY JSON without markdown.`;

    const aiRes = await getRawAICompletion(uid, systemPrompt, message, []);
    let cleaned = aiRes.content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleaned);

    const amount = typeof parsed.totalAmount === "number" ? Math.abs(parsed.totalAmount) : 0;
    const paidBy = parsed.paidById && members.some((m) => m.id === parsed.paidById)
      ? parsed.paidById
      : uid;

    const splitIds: string[] = Array.isArray(parsed.splitMemberIds) && parsed.splitMemberIds.length > 0
      ? parsed.splitMemberIds.filter((id: string) => members.some((m) => m.id === id))
      : members.map((m) => m.id);

    const shareCount = splitIds.length || 1;
    const baseShare = Math.floor((amount / shareCount) * 100) / 100;
    let remainder = Math.round((amount - baseShare * shareCount) * 100) / 100;

    const splits = splitIds.map((mId) => {
      let sAmt = baseShare;
      if (remainder > 0) {
        sAmt = Math.round((sAmt + 0.01) * 100) / 100;
        remainder = Math.round((remainder - 0.01) * 100) / 100;
      }
      return {
        memberRef: mId,
        amount: sAmt,
      };
    });

    return NextResponse.json({
      success: true,
      parsed: {
        description: parsed.description || "Group Expense",
        category: parsed.category || "General",
        totalAmount: amount,
        paidBy,
        splits,
        date: format(new Date(), "yyyy-MM-dd"),
      },
      modelUsed: aiRes.modelUsed,
    });
  } catch (error: any) {
    console.error("AI group log error:", error);
    if (error instanceof BYOKError) {
      return NextResponse.json({ error: error.userFriendlyMessage }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to process group expense" }, { status: 500 });
  }
}
