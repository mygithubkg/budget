"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  writeBatch,
} from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase/client";
import { UserProfile } from "@/types";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to ensure user doc + seeded categories exist in Firestore
  const initUserDocument = async (authUser: User, customName?: string) => {
    try {
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const displayName = customName || authUser.displayName || "User";
        const newProfile: UserProfile = {
          uid: authUser.uid,
          displayName,
          email: authUser.email,
          currency: "INR",
          createdAt: new Date().toISOString(),
          defaultCategories: DEFAULT_CATEGORIES,
        };

        await setDoc(userRef, {
          displayName,
          email: authUser.email,
          currency: "INR",
          createdAt: serverTimestamp(),
          defaultCategories: DEFAULT_CATEGORIES,
        });

        // Seed default categories into users/{uid}/categories subcollection
        const batch = writeBatch(db);
        for (const catName of DEFAULT_CATEGORIES) {
          const catRef = doc(collection(db, "users", authUser.uid, "categories"));
          batch.set(catRef, {
            name: catName,
            isDefault: true,
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();

        setUserProfile(newProfile);
      } else {
        const data = userSnap.data();
        setUserProfile({
          uid: authUser.uid,
          displayName: data.displayName || authUser.displayName || "User",
          email: data.email || authUser.email,
          currency: data.currency || "INR",
          createdAt: data.createdAt ? data.createdAt.toDate?.()?.toISOString?.() || new Date().toISOString() : new Date().toISOString(),
          defaultCategories: data.defaultCategories || DEFAULT_CATEGORIES,
        });
      }
    } catch (err) {
      console.error("Error initializing user doc:", err);
      // Fallback profile if Firestore is offline or in mock state
      setUserProfile({
        uid: authUser.uid,
        displayName: customName || authUser.displayName || "User",
        email: authUser.email,
        currency: "INR",
        createdAt: new Date().toISOString(),
        defaultCategories: DEFAULT_CATEGORIES,
      });
    }
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile({
          uid: auth.currentUser.uid,
          displayName: data.displayName || auth.currentUser.displayName,
          email: data.email || auth.currentUser.email,
          currency: data.currency || "INR",
          createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          defaultCategories: data.defaultCategories || DEFAULT_CATEGORIES,
        });
      }
    } catch (e) {
      console.error("Failed to refresh profile:", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        await initUserDocument(authUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    await initUserDocument(res.user);
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name?: string
  ) => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    if (name && res.user) {
      await updateProfile(res.user, { displayName: name });
    }
    await initUserDocument(res.user, name);
  };

  const signInWithGoogle = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    await initUserDocument(res.user);
  };

  const logout = async () => {
    await fbSignOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const updateCurrency = async (newCurrency: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { currency: newCurrency }, { merge: true });
      setUserProfile((prev) => (prev ? { ...prev, currency: newCurrency } : null));
    } catch (err) {
      console.error("Failed to update currency:", err);
      throw err;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        logout,
        updateCurrency,
        refreshProfile,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
