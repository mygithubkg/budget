"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  limit,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Friend, FriendLedgerEntry } from "@/types";

export function useFriends() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["friends", user?.uid],
    queryFn: async (): Promise<Friend[]> => {
      if (!user) return [];
      try {
        const friendsRef = collection(db, "users", user.uid, "friends");
        const q = query(friendsRef, orderBy("name", "asc"));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "",
            balance: Number(data.balance) || 0,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt || Date.now()),
          };
        });
      } catch (err) {
        console.error("Error fetching friends:", err);
        return [];
      }
    },
    enabled: !!user,
  });
}

export function useFriendLedger(friendId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["friend-ledger", user?.uid, friendId],
    queryFn: async (): Promise<FriendLedgerEntry[]> => {
      if (!user || !friendId) return [];

      const entriesMap = new Map<string, FriendLedgerEntry>();

      // 1. Fetch friend details to get friend's name
      let friendName = "";
      try {
        const friendDocRef = doc(db, "users", user.uid, "friends", friendId);
        const friendSnap = await getDoc(friendDocRef);
        if (friendSnap.exists()) {
          friendName = (friendSnap.data()?.name || "").toLowerCase().trim();
        }
      } catch (e) {
        console.warn("Could not fetch friend name for ledger query:", e);
      }

      // 2. Fetch ledger subcollection (settlements and direct entries)
      try {
        const ledgerRef = collection(
          db,
          "users",
          user.uid,
          "friends",
          friendId,
          "ledger"
        );
        let snapshot;
        try {
          const q = query(ledgerRef, orderBy("date", "desc"), limit(100));
          snapshot = await getDocs(q);
        } catch {
          snapshot = await getDocs(ledgerRef);
        }

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const entryDate =
            data.date instanceof Timestamp
              ? data.date.toDate()
              : new Date(data.date || Date.now());

          const key = data.transactionId || docSnap.id;
          entriesMap.set(key, {
            id: docSnap.id,
            transactionId: data.transactionId,
            amount: Number(data.amount) || 0,
            type: data.type || "owe",
            direction: data.direction,
            date: entryDate,
            note: data.note || (data.type === "settle" ? "Settled Balance" : "Shared expense"),
          });
        });
      } catch (err) {
        console.warn("Ledger subcollection fetch error:", err);
      }

      // 3. Fetch from main transactions collection to capture all expense splits
      try {
        const transRef = collection(db, "users", user.uid, "transactions");
        let transSnap;
        try {
          const q = query(transRef, orderBy("date", "desc"), limit(200));
          transSnap = await getDocs(q);
        } catch {
          transSnap = await getDocs(transRef);
        }

        transSnap.docs.forEach((d) => {
          const tData = d.data();
          if (Array.isArray(tData.splits) && tData.splits.length > 0) {
            const matchSplit = tData.splits.find((s: any) => {
              const sFriendId = String(s.friendId || "").trim();
              const sName = String(s.friendName || "").toLowerCase().trim();
              return (
                (sFriendId && sFriendId === friendId) ||
                (friendName && sName && sName === friendName) ||
                (friendName && sName && (sName.includes(friendName) || friendName.includes(sName)))
              );
            });

            if (matchSplit) {
              const isIOweThem = matchSplit.direction === "i_owe_them";
              const key = d.id;
              const entryDate =
                tData.date instanceof Timestamp
                  ? tData.date.toDate()
                  : new Date(tData.date || Date.now());

              // Add or update with transaction details if not already present with note
              if (!entriesMap.has(key)) {
                entriesMap.set(key, {
                  id: d.id,
                  transactionId: d.id,
                  amount: Number(matchSplit.amount) || 0,
                  type: isIOweThem ? "borrow" : "owe",
                  direction: matchSplit.direction || (isIOweThem ? "i_owe_them" : "they_owe_me"),
                  date: entryDate,
                  note: tData.description || "Shared expense",
                });
              } else {
                const existing = entriesMap.get(key)!;
                if (!existing.note || existing.note === "Shared expense") {
                  existing.note = tData.description || existing.note;
                }
              }
            }
          }
        });
      } catch (err) {
        console.warn("Transactions splits fetch error:", err);
      }

      // 4. Convert to array and sort chronologically descending
      const allEntries = Array.from(entriesMap.values());
      allEntries.sort((a, b) => {
        const timeA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const timeB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return timeB - timeA;
      });

      return allEntries;
    },
    enabled: !!user && !!friendId,
  });
}

export interface SettleUpInput {
  friendId: string;
  amount: number;
  note?: string;
}

export function useSettleUp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ friendId, amount, note = "Settled up" }: SettleUpInput) => {
      if (!user) throw new Error("User not authenticated");

      return await runTransaction(db, async (t) => {
        const friendRef = doc(db, "users", user.uid, "friends", friendId);
        const friendSnap = await t.get(friendRef);

        if (!friendSnap.exists()) {
          throw new Error("Friend not found");
        }

        const currentBalance = Number(friendSnap.data().balance) || 0;
        // If friend owes user (balance > 0), settling reduces balance towards 0
        // If user owes friend (balance < 0), settling increases balance towards 0
        let newBalance = currentBalance;
        if (currentBalance > 0) {
          newBalance = currentBalance - amount;
        } else if (currentBalance < 0) {
          newBalance = currentBalance + amount;
        } else {
          newBalance = 0;
        }

        t.update(friendRef, { balance: newBalance });

        const ledgerRef = doc(
          collection(db, "users", user.uid, "friends", friendId, "ledger")
        );
        t.set(ledgerRef, {
          amount,
          type: "settle",
          date: serverTimestamp(),
          note,
        });

        return { friendId, newBalance, amount };
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["friends", user?.uid] });
      queryClient.invalidateQueries({
        queryKey: ["friend-ledger", user?.uid, variables.friendId],
      });
    },
  });
}
