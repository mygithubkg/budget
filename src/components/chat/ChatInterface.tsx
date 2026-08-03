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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Sparkles,
  Bot,
  Loader2,
  Wallet,
  Clock,
  Users,
  PieChart,
  MessageSquare,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { OFF_TOPIC_RESPONSE, ChatApiResponse } from "@/lib/validations";
import { toast } from "sonner";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const SUGGESTED_CHIPS = [
  { label: "Spent 250 on coffee with Sam", icon: Sparkles },
  { label: "What is my current balance?", icon: Wallet },
  { label: "Show my recent transactions", icon: Clock },
  { label: "Who owes me money?", icon: Users },
  { label: "Give me a financial update", icon: PieChart },
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
   * Status Query Handler: reads Firestore data & constructs structured response
   */
  const handleStatusQuery = async (
    queryType: "balance" | "last_transactions" | "friend_debts" | "general_summary"
  ): Promise<{ content: string; statusData: StatusQueryResult }> => {
    const currency = userProfile?.currency || "INR";

    // 1. Calculate Balance
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

    // 2. Query Recent 5 Transactions
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

    // 3. Query Outstanding Friend Debts
    const outstandingFriends: StatusFriendDebtSummary[] = friends
      .filter((f) => f.balance !== 0)
      .map((f) => ({
        friendId: f.id,
        friendName: f.name,
        balance: f.balance,
      }));

    if (queryType === "balance") {
      return {
        content: `Your current balance is ${formatCurrency(currentBalance, currency)}.`,
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
          content: "You haven't logged any transactions yet.",
          statusData: {
            queryType: "last_transactions",
            transactions: [],
          },
        };
      }
      return {
        content: `Here are your ${recentTxList.length} most recent transactions:`,
        statusData: {
          queryType: "last_transactions",
          transactions: recentTxList,
        },
      };
    }

    if (queryType === "friend_debts") {
      if (outstandingFriends.length === 0) {
        return {
          content: "You have no outstanding friend debts. Everyone is all settled up!",
          statusData: {
            queryType: "friend_debts",
            friendDebts: [],
          },
        };
      }
      return {
        content: `Here is your current friend balance breakdown:`,
        statusData: {
          queryType: "friend_debts",
          friendDebts: outstandingFriends,
        },
      };
    }

    // General Summary
    return {
      content: `Here is your quick financial overview:`,
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
      // 1. Persist user message to Firestore with 2-hour TTL
      await addMessage({
        role: "user",
        content: rawText.trim(),
        intent: null,
      });

      const idToken = await getIdToken();
      const todayDate = new Date().toISOString().split("T")[0];
      const categoryNames = categories.map((c) => c.name);
      const friendNames = friends.map((f) => f.name);

      // 2. Call Intent Router API (/api/chat)
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
        throw new Error(errJson.error || "Failed to process message");
      }

      const result: ChatApiResponse = await response.json();

      // 3. Handle Intent: OFF-TOPIC Guardrail
      if (result.intent === "off_topic") {
        await addMessage({
          role: "assistant",
          content: OFF_TOPIC_RESPONSE,
          intent: "off_topic",
          status: "off_topic",
        });
        return;
      }

      // 4. Handle Intent: STATUS QUERY
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

      // 5. Handle Intent: LOG TRANSACTION (Multi-Expense Support)
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
            content: "I couldn't quite extract the expense details. Could you specify the amount and item?",
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
              "Could you please specify how much was spent or received?",
            intent: "log_transaction",
            status: "clarification",
          });
          return;
        }

        // Show confirmation card with itemized transactions
        const promptText =
          txList.length > 1
            ? `I found ${txList.length} expenses in your message. Please review and confirm:`
            : "Here's what I extracted. Please review and confirm:";

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
          "I couldn't process that message. Please try again or rephrase.",
        status: "error",
        error: err.message,
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  /**
   * Confirm and Commit Multi-Expense Batch to Firestore
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

      // Save each transaction independently with shared groupId
      for (const item of finalList) {
        const splitsWithIds = (item.splits || []).map((s) => {
          const found = friends.find(
            (f) => f.name.toLowerCase() === s.friendName.toLowerCase()
          );
          return {
            friendId: found?.id,
            friendName: s.friendName,
            amount: s.amount,
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

      // Assistant follow-up summary
      const totalAmount = finalList.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
      let summaryText = "";

      if (finalList.length === 1) {
        const item = finalList[0];
        summaryText = `Logged ${formatCurrency(
          item.totalAmount,
          currency
        )} for ${item.description} (${item.category}).`;

        if (item.splits && item.splits.length > 0) {
          summaryText += ` Your share: ${formatCurrency(
            item.userShare,
            currency
          )}.`;
          const friendOwed = item.splits
            .map(
              (s) => `${s.friendName} owes you ${formatCurrency(s.amount, currency)}`
            )
            .join(", ");
          summaryText += ` ${friendOwed}.`;
        }
      } else {
        const breakdown = finalList
          .map(
            (t) =>
              `${t.description}${t.category ? ` (${t.category})` : ""} ${formatCurrency(
                t.totalAmount,
                currency
              )}`
          )
          .join(", ");

        summaryText = `Logged ${finalList.length} expenses totaling ${formatCurrency(
          totalAmount,
          currency
        )} — ${breakdown}.`;
      }

      // Update message doc in Firestore
      await updateMessage(messageId, {
        status: "confirmed",
        content: summaryText,
        parsedTransactions: null,
        parsedData: null,
        groupId,
      });

      toast.success(
        finalList.length === 1
          ? "Transaction saved successfully!"
          : `${finalList.length} transactions logged successfully!`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to commit transactions to database.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Cancel and Discard Confirmation Card
   */
  const handleCancelConfirmation = async (messageId: string) => {
    try {
      await updateMessage(messageId, {
        status: "cancelled",
        content: "Transaction discarded.",
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
    <div className="flex h-screen w-full flex-col bg-background">
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card/60 px-6 backdrop-blur-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/20 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold leading-tight">FinChat Assistant</h2>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground">
              Natural Language Logger & Financial Status Bot
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground bg-background/50">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>Groq Llama 3.3 70B • 2h History</span>
          </span>
        </div>
      </header>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 space-y-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {/* Friendly Empty State */}
          {!isMessagesLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-4 animate-in fade-in-50 duration-300">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="text-base font-bold text-foreground">
                  Ready when you are!
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tell me about an expense, log income, or ask about your current
                  balance, recent transactions, and friend debts.
                </p>
              </div>

              {/* Quick suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-lg">
                {SUGGESTED_CHIPS.map((chip, idx) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip.label)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card/60 px-3 py-1.5 text-xs text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-95 shadow-sm"
                    >
                      <Icon className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
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
            <div className="flex items-center gap-3 text-muted-foreground my-3 animate-in fade-in duration-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl bg-muted/60 px-4 py-2.5 text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Quick Prompts when conversation has messages */}
      {messages.length > 0 && messages.length <= 4 && (
        <div className="border-t border-border/40 bg-card/30 px-4 py-2 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SUGGESTED_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.label)}
                className="shrink-0 rounded-xl border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-95"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pinned Input Area */}
      <div className="border-t border-border bg-card/80 p-4 backdrop-blur-xl shrink-0">
        <div className="mx-auto flex max-w-3xl items-end gap-2.5">
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Spent 450 on lunch, or 'What is my balance?'..."
              className="min-h-[48px] max-h-32 py-3 pr-12 rounded-2xl bg-background/90 text-sm shadow-inner"
              rows={1}
            />
          </div>

          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isAiLoading}
            variant="gradient"
            size="icon"
            className="h-12 w-12 rounded-2xl shrink-0 shadow-md shadow-indigo-500/20"
          >
            {isAiLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="mx-auto max-w-3xl text-center text-[10px] text-muted-foreground/70 pt-2">
          Press Enter to send • Shift+Enter for new line • Messages expire after 2 hours
        </p>
      </div>
    </div>
  );
}
