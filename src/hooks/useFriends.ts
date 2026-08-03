"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  addDoc,
  updateDoc,
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
      try {
        const ledgerRef = collection(
          db,
          "users",
          user.uid,
          "friends",
          friendId,
          "ledger"
        );
        const q = query(ledgerRef, orderBy("date", "desc"));
        const snapshot = await getDocs(q);

        return snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            transactionId: data.transactionId,
            amount: Number(data.amount) || 0,
            type: data.type || "owe",
            date:
              data.date instanceof Timestamp
                ? data.date.toDate()
                : new Date(data.date || Date.now()),
            note: data.note || "",
          };
        });
      } catch (err) {
        console.error("Error fetching friend ledger:", err);
        return [];
      }
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
