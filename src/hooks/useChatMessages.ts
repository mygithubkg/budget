"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/client";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { ChatMessage, ChatMessageStatus, ParsedExpense, StatusQueryResult } from "@/types";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function useChatMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const messagesCol = collection(db, "users", user.uid, "chatMessages");
    const q = query(messagesCol, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const loaded: ChatMessage[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();

          // Convert timestamps
          const createdAtDate =
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate()
              : data.createdAt
              ? new Date(data.createdAt)
              : new Date();

          const expireAtDate =
            data.expireAt instanceof Timestamp
              ? data.expireAt.toDate()
              : data.expireAt
              ? new Date(data.expireAt)
              : new Date(createdAtDate.getTime() + TWO_HOURS_MS);

          // Client-side guard: filter out messages that have passed their 2-hour TTL
          if (expireAtDate.getTime() <= now) {
            return;
          }

          loaded.push({
            id: docSnap.id,
            role: data.role,
            content: data.content,
            intent: data.intent || null,
            createdAt: createdAtDate,
            expireAt: expireAtDate,
            parsedData: data.parsedData || null,
            parsedTransactions: data.parsedTransactions || (data.parsedData ? [data.parsedData] : null),
            statusData: data.statusData || null,
            status: data.status,
            transactionId: data.transactionId,
            groupId: data.groupId,
            modelUsed: data.modelUsed,
            error: data.error,
          });
        });

        setMessages(loaded);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error listening to chat messages:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  /**
   * Add a new chat message to Firestore with 2-hour auto-expiring TTL
   */
  const addMessage = async (
    message: Omit<ChatMessage, "id" | "createdAt" | "expireAt"> & { id?: string }
  ): Promise<string> => {
    if (!user) throw new Error("User must be logged in to send chat messages");

    const messageId = message.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const docRef = doc(db, "users", user.uid, "chatMessages", messageId);

    const now = new Date();
    const expireDate = new Date(now.getTime() + TWO_HOURS_MS);

    const dataToSave: any = {
      role: message.role,
      content: message.content,
      intent: message.intent || null,
      createdAt: Timestamp.fromDate(now),
      expireAt: Timestamp.fromDate(expireDate),
      status: message.status || null,
    };

    if (message.parsedData) dataToSave.parsedData = message.parsedData;
    if (message.parsedTransactions) dataToSave.parsedTransactions = message.parsedTransactions;
    if (message.statusData) dataToSave.statusData = message.statusData;
    if (message.transactionId) dataToSave.transactionId = message.transactionId;
    if (message.groupId) dataToSave.groupId = message.groupId;
    if (message.modelUsed) dataToSave.modelUsed = message.modelUsed;
    if (message.error) dataToSave.error = message.error;

    await setDoc(docRef, dataToSave);
    return messageId;
  };

  /**
   * Update an existing chat message in Firestore
   */
  const updateMessage = async (
    messageId: string,
    updates: Partial<ChatMessage>
  ) => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid, "chatMessages", messageId);

    const dataToUpdate: any = {};
    if (updates.content !== undefined) dataToUpdate.content = updates.content;
    if (updates.status !== undefined) dataToUpdate.status = updates.status;
    if (updates.parsedData !== undefined) dataToUpdate.parsedData = updates.parsedData;
    if (updates.parsedTransactions !== undefined) dataToUpdate.parsedTransactions = updates.parsedTransactions;
    if (updates.statusData !== undefined) dataToUpdate.statusData = updates.statusData;
    if (updates.transactionId !== undefined) dataToUpdate.transactionId = updates.transactionId;
    if (updates.groupId !== undefined) dataToUpdate.groupId = updates.groupId;
    if (updates.modelUsed !== undefined) dataToUpdate.modelUsed = updates.modelUsed;
    if (updates.error !== undefined) dataToUpdate.error = updates.error;

    await updateDoc(docRef, dataToUpdate);
  };

  /**
   * Delete a chat message
   */
  const deleteMessage = async (messageId: string) => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid, "chatMessages", messageId);
    await deleteDoc(docRef);
  };

  return {
    messages,
    isLoading,
    addMessage,
    updateMessage,
    deleteMessage,
  };
}
