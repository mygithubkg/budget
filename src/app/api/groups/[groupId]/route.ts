import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  GroupMemberInfo,
  GroupTransaction,
  GroupSettlement,
} from "@/types/group";
import {
  calculateMemberBalances,
  simplifyDebts,
} from "@/lib/groups/debt-simplification";

export async function GET(
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

    // 1. Resolve registered member names
    const members: GroupMemberInfo[] = [];

    for (const memberUid of memberUids) {
      try {
        const userDoc = await adminDb.collection("users").doc(memberUid).get();
        const uData = userDoc.exists ? userDoc.data() : null;
        let displayName = uData?.displayName;

        if (!displayName) {
          try {
            const userRecord = await adminAuth.getUser(memberUid);
            displayName = userRecord.displayName || userRecord.email?.split("@")[0];
          } catch {}
        }

        members.push({
          id: memberUid,
          name: displayName || (memberUid === uid ? "You" : `Member ${memberUid.slice(0, 4)}`),
          isGhost: false,
          email: uData?.email,
        });
      } catch {
        members.push({
          id: memberUid,
          name: memberUid === uid ? "You" : `Member ${memberUid.slice(0, 4)}`,
          isGhost: false,
        });
      }
    }

    // 2. Add ghost members
    const ghostMembers = groupData.ghostMembers || [];
    for (const gm of ghostMembers) {
      members.push({
        id: gm.ghostId,
        name: gm.name,
        isGhost: true,
      });
    }

    // 3. Fetch Transactions
    const txSnap = await adminDb
      .collection("groups")
      .doc(groupId)
      .collection("transactions")
      .orderBy("date", "desc")
      .get();

    const transactions: GroupTransaction[] = txSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        groupId,
        description: data.description,
        category: data.category || "General",
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        totalAmount: data.totalAmount,
        paidBy: data.paidBy,
        splits: data.splits || [],
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        source: data.source,
      };
    });

    // 4. Fetch Settlements
    const stSnap = await adminDb
      .collection("groups")
      .doc(groupId)
      .collection("settlements")
      .orderBy("date", "desc")
      .get();

    const settlements: GroupSettlement[] = stSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        groupId,
        fromMemberRef: data.fromMemberRef,
        toMemberRef: data.toMemberRef,
        amount: data.amount,
        date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      };
    });

    // 5. Calculate Balances & Simplified Debts
    const balances = calculateMemberBalances(members, transactions, settlements);
    const simplifiedDebts = simplifyDebts(members, transactions, settlements);

    return NextResponse.json({
      group: {
        id: groupDoc.id,
        name: groupData.name,
        createdBy: groupData.createdBy,
        createdAt: groupData.createdAt?.toDate ? groupData.createdAt.toDate().toISOString() : groupData.createdAt,
        memberUids: groupData.memberUids || [],
        ghostMembers: groupData.ghostMembers || [],
        inviteCode: groupData.inviteCode,
      },
      members,
      transactions,
      settlements,
      balances,
      simplifiedDebts,
    });
  } catch (error: any) {
    console.error(`GET /api/groups/${params.groupId} error:`, error);
    return NextResponse.json({ error: error.message || "Failed to load group" }, { status: 500 });
  }
}
