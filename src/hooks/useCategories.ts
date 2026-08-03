"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Category } from "@/types";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { findSimilarCategory } from "@/lib/category-utils";

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["categories", user?.uid],
    queryFn: async (): Promise<Category[]> => {
      if (!user) {
        return DEFAULT_CATEGORIES.map((name, i) => ({
          id: `default-${i}`,
          name,
          isDefault: true,
          createdAt: new Date(),
        }));
      }

      try {
        const catRef = collection(db, "users", user.uid, "categories");
        const q = query(catRef, orderBy("name", "asc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          return DEFAULT_CATEGORIES.map((name, i) => ({
            id: `default-${i}`,
            name,
            isDefault: true,
            createdAt: new Date(),
          }));
        }

        return snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name || "",
            isDefault: data.isDefault ?? false,
            createdAt:
              data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt || Date.now()),
          };
        });
      } catch (err) {
        console.error("Error fetching categories:", err);
        return DEFAULT_CATEGORIES.map((name, i) => ({
          id: `default-${i}`,
          name,
          isDefault: true,
          createdAt: new Date(),
        }));
      }
    },
    enabled: !!user,
  });
}

export function useAddCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rawName: string) => {
      if (!user) throw new Error("User not authenticated");

      // Fetch existing categories to check similarity
      const catRef = collection(db, "users", user.uid, "categories");
      const snapshot = await getDocs(catRef);
      const existingNames = snapshot.docs.map((d) => d.data().name as string);

      const check = findSimilarCategory(rawName, existingNames);
      if (check.isExisting) {
        // Return existing resolved category
        return { name: check.resolvedName, isExisting: true };
      }

      const docRef = await addDoc(catRef, {
        name: check.resolvedName,
        isDefault: false,
        createdAt: serverTimestamp(),
      });

      return { id: docRef.id, name: check.resolvedName, isExisting: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", user?.uid] });
    },
  });
}

export function useDeleteCategory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!user) throw new Error("User not authenticated");
      const catDoc = doc(db, "users", user.uid, "categories", categoryId);
      await deleteDoc(catDoc);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", user?.uid] });
    },
  });
}
