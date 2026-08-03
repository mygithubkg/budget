"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { useFriends } from "@/hooks/useFriends";
import { useTransactions, useAddTransaction } from "@/hooks/useTransactions";
import { useChatMessages } from "@/hooks/useChatMessages";
import {
  ChatMessage,
  ParsedExpense,
  StatusQueryResult,
  StatusTransactionSummary,
  StatusFriendDebtSummary,
} from "@/types";
import { MessageBubble } from "./MessageBubble";
import {
  Send,
  Loader2,
  BookOpen,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { OFF_TOPIC_RESPONSE, ChatApiResponse } from "@/lib/validations";
import { toast } from "sonner";

const SUGGESTED_CHIPS = [
  "Spent 250 on coffee with Sam",
  "What is my current balance?",
  "Show my recent entries",
  "Who owes me money?",
  "Give me a ledger summary",
];

export function ChatInterface() {
  const { user, userProfile, getIdToken } = useAuth();
  const { data: categories = [] } = useCategories();
  const { data: friends = [] } = useFriends();
  const { data: allTransactions = [] } = useTransactions();
  const addTransactionMutation = useAddTransaction();
  const { messages, isLoading: isMessagesLoading, addMessage, updateMessage } =
    useChatMessages();

  const [inputText, setInputText] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiLoading]);

  /**
   * Status Query Handler
   */
  const handleStatusQuery = async (
    queryType: "balance" | "last_transactions" | "friend_debts" | "general_summary"
  ): Promise<{ content: string; statusData: StatusQueryResult }> => {
    const currency = userProfile?.currency || "INR";

    let totalIncome = 0;
    let totalExpense = 0;
    allTransactions.forEach((t) => {
      if (t.type === "income") {
        totalIncome += t.amount;
      } else {
        totalExpense += t.userShare;
      }
    });
    const currentBalance = totalIncome - totalExpense;

    const recentTxList: StatusTransactionSummary[] = allTransactions
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        description: t.description,
        category: t.category,
        amount: t.amount,
        userShare: t.userShare,
        type: t.type,
        date:
          t.date instanceof Date
            ? t.date.toISOString().split("T")[0]
            : String(t.date).split("T")[0],
      }));

    const outstandingFriends: StatusFriendDebtSummary[] = friends
      .filter((f) => f.balance !== 0)
      .map((f) => ({
        friendId: f.id,
        friendName: f.name,
        balance: f.balance,
      }));

    if (queryType === "balance") {
      return {
        content: `Current ledger net balance: ${formatCurrency(currentBalance, currency)}.`,
        statusData: {
          queryType: "balance",
          balance: currentBalance,
          totalIncome,
          totalExpense,
        },
      };
    }

    if (queryType === "last_transactions") {
      if (recentTxList.length === 0) {
        return {
          content: "No ledger entries have been recorded yet.",
          statusData: {
            queryType: "last_transactions",
            transactions: [],
          },
        };
      }
      return {
        content: `Showing your ${recentTxList.length} most recent ruled entries:`,
        statusData: {
          queryType: "last_transactions",
          transactions: recentTxList,
        },
      };
    }

    if (queryType === "friend_debts") {
      if (outstandingFriends.length === 0) {
        return {
          content: "No outstanding balances with friends. All accounts are settled.",
          statusData: {
            queryType: "friend_debts",
            friendDebts: [],
          },
        };
      }
      return {
        content: `Current friend debt register:`,
        statusData: {
          queryType: "friend_debts",
          friendDebts: outstandingFriends,
        },
      };
    }

    return {
      content: `Ledger account overview:`,
      statusData: {
        queryType: "general_summary",
        balance: currentBalance,
        totalIncome,
        totalExpense,
        transactions: recentTxList.slice(0, 3),
        friendDebts: outstandingFriends.slice(0, 2),
      },
    };
  };

  /**
   * Main Send Message Handler
   */
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputText;
    if (!rawText.trim() || isAiLoading || !user) return;

    if (!textToSend) setInputText("");
    setIsAiLoading(true);

    try {
      await addMessage({
        role: "user",
        content: rawText.trim(),
        intent: null,
      });

      const idToken = await getIdToken();
      const todayDate = new Date().toISOString().split("T")[0];
      const categoryNames = categories.map((c) => c.name);
      const friendNames = friends.map((f) => f.name);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          message: rawText.trim(),
          categoryList: categoryNames,
          friendList: friendNames,
          todayDate,
          conversationHistory: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to process entry");
      }

      const result: ChatApiResponse = await response.json();

      if (result.intent === "off_topic") {
        await addMessage({
          role: "assistant",
          content: OFF_TOPIC_RESPONSE,
          intent: "off_topic",
          status: "off_topic",
        });
        return;
      }

      if (result.intent === "status_query" && result.queryType) {
        const statusResult = await handleStatusQuery(result.queryType);
        await addMessage({
          role: "assistant",
          content: statusResult.content,
          intent: "status_query",
          status: "status_query",
          statusData: statusResult.statusData,
        });
        return;
      }

      if (result.intent === "log_transaction") {
        const txList =
          result.transactions && result.transactions.length > 0
            ? result.transactions
            : result.transaction
            ? [result.transaction]
            : [];

        if (txList.length === 0) {
          await addMessage({
            role: "assistant",
            content: "Could not parse entry details. Please specify the amount, item description, and category.",
            status: "error",
          });
          return;
        }

        const needsClarificationItem = txList.find(
          (t) => t.needsClarification && t.clarificationQuestion
        );

        if (needsClarificationItem) {
          await addMessage({
            role: "assistant",
            content:
              needsClarificationItem.clarificationQuestion ||
              "Please clarify the exact amount or split for this entry.",
            intent: "log_transaction",
            status: "clarification",
          });
          return;
        }

        const promptText =
          txList.length > 1
            ? `Extracted ${txList.length} ruled entries for confirmation:`
            : "Extracted entry for confirmation:";

        await addMessage({
          role: "assistant",
          content: promptText,
          intent: "log_transaction",
          status: "pending_confirmation",
          parsedTransactions: txList,
          parsedData: txList[0],
          modelUsed: result.modelUsed || undefined,
        });
      }
    } catch (err: any) {
      console.error(err);
      await addMessage({
        role: "assistant",
        content:
          err.message ||
          "Could not process entry. Please verify details and try again.",
        status: "error",
        error: err.message,
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  /**
   * Confirm and Stamp Transactions
   */
  const handleConfirmTransaction = async (
    messageId: string,
    finalList: ParsedExpense[]
  ) => {
    if (!finalList || finalList.length === 0) return;
    setIsSaving(true);

    try {
      const currency = userProfile?.currency || "INR";
      const groupId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `grp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      for (const item of finalList) {
        const splitsWithIds = (item.splits || []).map((s) => {
          const found = friends.find(
            (f) => f.name.toLowerCase() === s.friendName.toLowerCase()
          );
          return {
            friendId: found?.id,
            friendName: s.friendName,
            amount: s.amount,
            direction: s.direction || "they_owe_me",
          };
        });

        await addTransactionMutation.mutateAsync({
          groupId,
          type: item.type,
          amount: item.totalAmount,
          userShare: item.userShare,
          description: item.description,
          category: item.category,
          date: new Date(item.date),
          rawInput: item.description,
          source: "chat",
          splits: splitsWithIds,
        });
      }

      const totalAmount = finalList.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
      let summaryText = "";

      if (finalList.length === 1) {
        const item = finalList[0];
        summaryText = `Recorded ${formatCurrency(
          item.totalAmount,
          currency
        )} under ${item.category}.`;

        if (item.splits && item.splits.length > 0) {
          const splitNotices = item.splits.map((s) =>
            s.direction === "i_owe_them"
              ? `You owe ${s.friendName} ${formatCurrency(s.amount, currency)}`
              : `${s.friendName} owes you ${formatCurrency(s.amount, currency)}`
          );
          summaryText += ` (${splitNotices.join(", ")})`;
        }
      } else {
        summaryText = `Recorded ${finalList.length} entries totaling ${formatCurrency(
          totalAmount,
          currency
        )}.`;
      }

      await updateMessage(messageId, {
        status: "confirmed",
        content: summaryText,
        parsedTransactions: finalList,
        parsedData: finalList[0],
        groupId,
      });

      toast.success(
        finalList.length === 1
          ? "Entry stamped into register"
          : `${finalList.length} entries stamped into register`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to commit entry to register.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelConfirmation = async (messageId: string) => {
    try {
      await updateMessage(messageId, {
        status: "cancelled",
        content: "Entry discarded.",
        parsedData: null,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen w-full flex-col bg-paper-bg">
      {/* Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-fiber-line bg-card-bg px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-stamp-indigo text-[#EDE7D6] font-display font-bold text-sm shadow-sm">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-ink-text leading-tight">
              Ledger Register
            </h2>
            <p className="text-[10px] font-mono text-muted-text">
              Ruled Account Bot
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-muted-text border border-fiber-line px-2 py-0.5 rounded-[3px] bg-paper-bg">
            Groq Llama 3.3 70B
          </span>
        </div>
      </header>

      {/* Centered Ledger Feed (max-w-[680px] single ledger page style) */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-[680px] space-y-3">
          {/* Empty State */}
          {!isMessagesLoading && messages.length === 0 && (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[6px] border border-fiber-line bg-card-bg text-stamp-indigo shadow-sm">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold text-ink-text">
                  Ledger Ready
                </h3>
                <p className="text-xs font-sans text-muted-text max-w-sm mx-auto">
                  Type any natural language expense, income, split, or query to record or review your accounts.
                </p>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap justify-center gap-1.5 pt-2 max-w-md mx-auto">
                {SUGGESTED_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    className="rounded-[4px] border border-fiber-line bg-card-bg hover:border-stamp-indigo px-2.5 py-1 text-[11px] font-sans text-ink-text transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Messages */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              currency={userProfile?.currency}
              onConfirm={handleConfirmTransaction}
              onCancel={handleCancelConfirmation}
              onRetry={(text) => handleSendMessage(text)}
              isSaving={isSaving}
            />
          ))}

          {/* AI Thinking Animation */}
          {isAiLoading && (
            <div className="flex items-center gap-2 text-muted-text my-2 pl-1 font-mono text-xs animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-stamp-indigo" />
              <span>Recording into ledger...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar pinned to bottom */}
      <div className="border-t border-fiber-line bg-card-bg p-3 sm:p-4 shrink-0">
        <div className="mx-auto flex max-w-[680px] items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Spent 500 on groceries, or 'What is my balance?'..."
              className="w-full min-h-[44px] max-h-28 py-2.5 px-3 rounded-[6px] border border-fiber-line bg-paper-bg text-xs font-sans text-ink-text placeholder:text-muted-text/60 focus:border-stamp-indigo focus:outline-none resize-none"
              rows={1}
            />
          </div>

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isAiLoading}
            className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-[#EDE7D6] transition-colors disabled:opacity-40 shrink-0"
            title="Record Entry"
          >
            {isAiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mx-auto max-w-[680px] text-center text-[10px] font-mono text-muted-text/70 pt-1.5">
          Enter to record • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
