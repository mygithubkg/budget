import { adminDb } from "./admin";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { ParsedExpenseData } from "@/lib/validations";
import { FriendSplit, TransactionSource, ParsedExpense } from "@/types";

export interface CommitResult {
  groupId?: string;
  transactionIds: string[];
  totalAmount: number;
  totalUserShare: number;
  count: number;
  summary: string;
}

/**
 * Server-side atomic transaction committer using Firebase Admin SDK.
 * Used by Telegram webhook callback confirmation and server-side chat processing.
 */
export async function commitParsedTransactions(
  uid: string,
  transactions: (ParsedExpense | ParsedExpenseData)[],
  source: TransactionSource = "telegram"
): Promise<CommitResult> {
  if (!uid) throw new Error("User ID is required to commit transactions.");
  if (!transactions || transactions.length === 0) {
    throw new Error("No transactions to commit.");
  }

  const groupId =
    transactions.length > 1
      ? `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      : undefined;

  const now = new Date();
  const createdTimestamp = Timestamp.fromDate(now);

  const transactionIds: string[] = [];
  let totalAmount = 0;
  let totalUserShare = 0;

  await adminDb.runTransaction(async (t) => {
    // 1. Fetch user's existing friends for name-to-id mapping and balance updates
    const friendsColRef = adminDb.collection("users").doc(uid).collection("friends");
    const friendsSnap = await t.get(friendsColRef);
    const existingFriends = friendsSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ref: docSnap.ref,
      name: docSnap.data().name || "",
      balance: Number(docSnap.data().balance) || 0,
    }));

    // Friend balance deltas tracked during this batch
    const friendDeltas: Map<
      string,
      {
        id: string;
        name: string;
        ref: FirebaseFirestore.DocumentReference;
        initialBalance: number;
        delta: number;
        isNew: boolean;
      }
    > = new Map();

    // Map existing friends into tracking map
    for (const f of existingFriends) {
      friendDeltas.set(f.name.toLowerCase(), {
        id: f.id,
        name: f.name,
        ref: f.ref,
        initialBalance: f.balance,
        delta: 0,
        isNew: false,
      });
    }

    const ledgerEntriesToCreate: {
      friendDocRef: FirebaseFirestore.DocumentReference;
      entryData: any;
    }[] = [];

    const transactionDocsToCreate: {
      transDocRef: FirebaseFirestore.DocumentReference;
      transData: any;
    }[] = [];

    for (const item of transactions) {
      const transDate = item.date ? new Date(item.date) : now;
      const transTimestamp = Timestamp.fromDate(
        isNaN(transDate.getTime()) ? now : transDate
      );

      const transDocRef = adminDb
        .collection("users")
        .doc(uid)
        .collection("transactions")
        .doc();

      const resolvedSplits: FriendSplit[] = [];

      if (item.splits && item.splits.length > 0 && item.type === "expense") {
        for (const split of item.splits) {
          const lowerName = split.friendName.toLowerCase().trim();
          let friendInfo = friendDeltas.get(lowerName);

          if (!friendInfo) {
            const newFriendRef = friendsColRef.doc();
            friendInfo = {
              id: newFriendRef.id,
              name: split.friendName.trim(),
              ref: newFriendRef,
              initialBalance: 0,
              delta: 0,
              isNew: true,
            };
            friendDeltas.set(lowerName, friendInfo);
          }

          const isIOweThem = split.direction === "i_owe_them";
          // Balance convention: positive = friend owes user, negative = user owes friend
          const delta = isIOweThem ? -split.amount : split.amount;
          friendInfo.delta += delta;

          const ledgerRef = friendInfo.ref.collection("ledger").doc();
          ledgerEntriesToCreate.push({
            friendDocRef: ledgerRef,
            entryData: {
              transactionId: transDocRef.id,
              amount: split.amount,
              type: isIOweThem ? "borrow" : "owe",
              direction: isIOweThem ? "i_owe_them" : "they_owe_me",
              date: transTimestamp,
              note: item.description || "Expense split",
              createdAt: createdTimestamp,
            },
          });

          resolvedSplits.push({
            friendId: friendInfo.id,
            friendName: friendInfo.name,
            amount: split.amount,
            direction: isIOweThem ? "i_owe_them" : "they_owe_me",
          });
        }
      }

      transactionDocsToCreate.push({
        transDocRef,
        transData: {
          groupId: groupId || null,
          type: item.type,
          amount: Number(item.totalAmount) || 0,
          userShare: Number(item.userShare) ?? Number(item.totalAmount) ?? 0,
          description: item.description || "Transaction",
          category: item.category || "Miscellaneous",
          date: transTimestamp,
          createdAt: createdTimestamp,
          rawInput: item.description || "",
          source,
          splits: resolvedSplits,
        },
      });

      transactionIds.push(transDocRef.id);
      totalAmount += Number(item.totalAmount) || 0;
      totalUserShare += Number(item.userShare) ?? Number(item.totalAmount) ?? 0;
    }

    // 2. Write/Update friends
    for (const friendInfo of friendDeltas.values()) {
      if (friendInfo.isNew) {
        t.set(friendInfo.ref, {
          name: friendInfo.name,
          balance: friendInfo.delta,
          createdAt: createdTimestamp,
        });
      } else if (friendInfo.delta !== 0) {
        t.update(friendInfo.ref, {
          balance: friendInfo.initialBalance + friendInfo.delta,
        });
      }
    }

    // 3. Create ledger records
    for (const entry of ledgerEntriesToCreate) {
      t.set(entry.friendDocRef, entry.entryData);
    }

    // 4. Create transaction docs
    for (const tx of transactionDocsToCreate) {
      t.set(tx.transDocRef, tx.transData);
    }
  });

  const summary =
    transactions.length === 1
      ? `Recorded ${transactions[0].description} (₹${transactions[0].totalAmount}) under ${transactions[0].category}.`
      : `Recorded ${transactions.length} entries totaling ₹${totalAmount}.`;

  return {
    groupId,
    transactionIds,
    totalAmount,
    totalUserShare,
    count: transactions.length,
    summary,
  };
}
