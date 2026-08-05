"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Transaction, FriendSplit, SplitDirection, TransactionSource } from "@/types";

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  type?: "expense" | "income";
}

export function useTransactions(filters?: TransactionFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.uid, filters],
    queryFn: async (): Promise<Transaction[]> => {
      if (!user) return [];

      try {
        const transRef = collection(db, "users", user.uid, "transactions");
        let q = query(transRef, orderBy("date", "desc"));

        const snapshot = await getDocs(q);
        let items: Transaction[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            groupId: data.groupId || undefined,
            type: data.type,
            amount: Number(data.amount) || 0,
            userShare: Number(data.userShare) ?? Number(data.amount) ?? 0,
            description: data.description || "",
            category: data.category || "Miscellaneous",
            date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date || Date.now()),
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
            rawInput: data.rawInput || "",
            splits: data.splits || [],
            source: data.source || "manual",
          };
        });

        // Apply client-side date & category filtering if specified
        if (filters?.startDate) {
          items = items.filter((t) => new Date(t.date) >= filters.startDate!);
        }
        if (filters?.endDate) {
          items = items.filter((t) => new Date(t.date) <= filters.endDate!);
        }
        if (filters?.category && filters.category !== "all") {
          items = items.filter((t) => t.category === filters.category);
        }
        if (filters?.type) {
          items = items.filter((t) => t.type === filters.type);
        }

        return items;
      } catch (err) {
        console.error("Error fetching transactions:", err);
        return [];
      }
    },
    enabled: !!user,
  });
}

export interface AddTransactionInput {
  groupId?: string;
  type: "expense" | "income";
  amount: number;
  userShare: number;
  description: string;
  category: string;
  date: Date | string;
  rawInput: string;
  source: TransactionSource;
  splits?: { friendId?: string; friendName: string; amount: number; direction?: SplitDirection }[];
}

export function useAddTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddTransactionInput) => {
      if (!user) throw new Error("User not authenticated");

      const transDate =
        input.date instanceof Date ? input.date : new Date(input.date);
      const firestoreDate = Timestamp.fromDate(transDate);

      // Perform atomic operation via Firestore transaction
      return await runTransaction(db, async (t) => {
        const transactionsCol = collection(db, "users", user.uid, "transactions");
        const newTransRef = doc(transactionsCol);

        const resolvedSplits: FriendSplit[] = [];

        if (input.splits && input.splits.length > 0 && input.type === "expense") {
          // Read all friends for user
          const friendsCol = collection(db, "users", user.uid, "friends");
          const friendsSnap = await getDocs(friendsCol);
          const existingFriends = friendsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as { id: string; name: string; balance: number }[];

          for (const split of input.splits) {
            let friendId = split.friendId;
            let currentBalance = 0;

            const found = existingFriends.find(
              (f) => f.name.toLowerCase() === split.friendName.toLowerCase()
            );

            if (found) {
              friendId = found.id;
              currentBalance = found.balance || 0;
            } else {
              // Create new friend doc
              const newFriendRef = doc(friendsCol);
              friendId = newFriendRef.id;
              t.set(newFriendRef, {
                name: split.friendName,
                balance: 0,
                createdAt: serverTimestamp(),
              });
            }

            const isIOweThem = split.direction === "i_owe_them";
            // Balance convention: positive = friend owes user, negative = user owes friend
            const delta = isIOweThem ? -split.amount : split.amount;

            // Update friend balance
            const friendRef = doc(db, "users", user.uid, "friends", friendId);
            t.update(friendRef, {
              balance: currentBalance + delta,
            });

            // Create ledger entry
            const ledgerRef = doc(
              collection(db, "users", user.uid, "friends", friendId, "ledger")
            );
            t.set(ledgerRef, {
              transactionId: newTransRef.id,
              amount: split.amount,
              type: isIOweThem ? "borrow" : "owe",
              direction: isIOweThem ? "i_owe_them" : "they_owe_me",
              date: firestoreDate,
              note: input.description,
            });

            resolvedSplits.push({
              friendId,
              friendName: split.friendName,
              amount: split.amount,
              direction: isIOweThem ? "i_owe_them" : "they_owe_me",
            });
          }
        }

        // Save transaction document
        t.set(newTransRef, {
          groupId: input.groupId || null,
          type: input.type,
          amount: Number(input.amount),
          userShare: Number(input.userShare),
          description: input.description,
          category: input.category,
          date: firestoreDate,
          createdAt: serverTimestamp(),
          rawInput: input.rawInput,
          source: input.source,
          splits: resolvedSplits,
        });

        return { id: newTransRef.id, ...input, splits: resolvedSplits };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["friends", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["categories", user?.uid] });
    },
  });
}

export function useDeleteTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (!user || !transaction.id) throw new Error("Missing transaction or user");

      await runTransaction(db, async (t) => {
        const transRef = doc(db, "users", user.uid, "transactions", transaction.id!);

        // Revert any friend debt updates if splits were associated
        if (transaction.splits && transaction.splits.length > 0) {
          for (const split of transaction.splits) {
            if (!split.friendId) continue;
            const friendRef = doc(db, "users", user.uid, "friends", split.friendId);
            const friendSnap = await t.get(friendRef);
            if (friendSnap.exists()) {
              const curBal = Number(friendSnap.data().balance) || 0;
              const isIOweThem = split.direction === "i_owe_them";
              const delta = isIOweThem ? -split.amount : split.amount;
              t.update(friendRef, {
                balance: curBal - delta,
              });
            }
          }
        }

        t.delete(transRef);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["friends", user?.uid] });
    },
  });
}
