"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
import { VoiceInputButton } from "./VoiceInputButton";
import Link from "next/link";
import {
  Send,
  Loader2,
  BookOpen,
  Camera,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { OFF_TOPIC_RESPONSE, ChatApiResponse } from "@/lib/validations";
import { useSpeechRecognition, DEFAULT_SPEECH_LANG } from "@/hooks/useSpeechRecognition";
import { compressReceiptImage } from "@/lib/image-compress";
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
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [srAnnouncement, setSrAnnouncement] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showVoiceFeedback = useCallback((msg: string) => {
    setVoiceFeedback(msg);
    setSrAnnouncement(msg);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = setTimeout(() => {
      setVoiceFeedback(null);
    }, 4500);
  }, []);

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
   * Handle Receipt Photo Capture and Scanning
   */
  const handleReceiptCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input so same file can be chosen again if needed
    e.target.value = "";

    try {
      setIsAiLoading(true);
      toast.info("Compressing receipt image...");
      const compressedDataUrl = await compressReceiptImage(file, 1600, 0.8);

      // Add user message with thumbnail
      await addMessage({
        role: "user",
        content: "Receipt photo scanned",
        imageUrl: compressedDataUrl,
      });

      const token = await getIdToken();
      if (!token) throw new Error("Authentication required");

      const response = await fetch("/api/chat/receipt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: compressedDataUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse receipt");
      }

      const txList: ParsedExpense[] = data.transactions || [];

      if (txList.length === 0) {
        await addMessage({
          role: "assistant",
          content: "No clear expense items could be extracted from this photo. Please try a clearer picture or enter details manually.",
          status: "error",
        });
        return;
      }

      const headerText = data.merchant
        ? `Extracted ${txList.length} line items from ${data.merchant}:`
        : `Extracted ${txList.length} line items from receipt:`;

      await addMessage({
        role: "assistant",
        content: headerText,
        intent: "log_transaction",
        status: "pending_confirmation",
        parsedTransactions: txList,
        parsedData: txList[0],
        modelUsed: data.modelUsed || undefined,
      });
    } catch (err: any) {
      console.error("Receipt capture error:", err);
      toast.error(err.message || "Failed to process receipt");
      await addMessage({
        role: "assistant",
        content: err.message || "Could not process receipt photo. Please try again.",
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
      const sourceMsg = messages.find((m) => m.id === messageId);
      const isFromReceipt = sourceMsg?.content?.toLowerCase().includes("receipt");

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
          source: isFromReceipt ? "receipt" : "chat",
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

  // Web Speech API Voice Recognition
  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript: voiceTranscript,
    interimTranscript: voiceInterim,
    start: startVoice,
    stop: stopVoice,
  } = useSpeechRecognition({
    lang: DEFAULT_SPEECH_LANG,
    onFinalTranscript: (finalText) => {
      setSrAnnouncement(`Recorded: ${finalText}`);
      handleSendMessage(finalText);
    },
    onError: (errMsg) => {
      showVoiceFeedback(errMsg);
    },
  });

  const handleToggleVoice = () => {
    if (isListening) {
      stopVoice();
      setSrAnnouncement("Stopped listening.");
    } else {
      setVoiceFeedback(null);
      setSrAnnouncement("Listening… speak now.");
      startVoice();
    }
  };

  // Live transcript display when listening
  const liveSpeechText = voiceInterim || voiceTranscript || "";

  return (
    <div className="flex h-full w-full flex-col bg-transparent overflow-hidden select-text">
      {/* Top Header */}
      <header className="flex h-14 items-center justify-between border-b border-outline-variant/40 bg-surface-container-low/90 backdrop-blur-xl px-4 sm:px-6 shrink-0 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-on-primary font-display font-bold text-sm shadow-sm">
            <BookOpen className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-on-surface leading-tight">
              AI Ledger Register
            </h2>
            <p className="text-[10px] font-jetbrains-mono text-on-surface-variant">
              Conversational Bookkeeper
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-jetbrains-mono uppercase text-on-surface-variant border border-outline-variant/40 px-2.5 py-0.5 rounded-full bg-surface-container">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>
      </header>

      {/* Centered Ledger Feed (max-w-[680px] single ledger page style) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 overscroll-contain touch-pan-y">
        <div className="mx-auto max-w-[680px] space-y-3">
          {/* Empty State */}
          {!isMessagesLoading && messages.length === 0 && (
            <div className="text-center py-8 sm:py-12 px-3 sm:px-4 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-outline-variant/40 bg-surface-container text-primary shadow-sm">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold text-on-surface">
                  Ledger Ready
                </h3>
                <p className="text-xs font-sans text-on-surface-variant max-w-sm mx-auto">
                  Type or speak any expense, income, split, or query to record or review your accounts.
                </p>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap justify-center gap-1.5 pt-2 max-w-md mx-auto">
                {SUGGESTED_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    className="rounded-xl border border-outline-variant/40 bg-surface-container hover:bg-surface-container-high hover:border-primary/50 active:scale-95 touch-manipulation px-3 py-1.5 text-xs font-sans text-on-surface transition-all"
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
            <div className="flex items-center gap-2 text-on-surface-variant my-2 pl-1 font-jetbrains-mono text-xs animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Recording into ledger...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar pinned to bottom */}
      <div className="sticky bottom-0 z-20 border-t border-outline-variant/40 bg-surface-container-low/90 backdrop-blur-xl p-2.5 sm:p-4 shrink-0 space-y-1.5 transition-colors">
        {/* Inline Voice Feedback / Screen Reader Live Region */}
        <div className="mx-auto max-w-[680px]">
          <div className="sr-only" aria-live="polite" role="status">
            {srAnnouncement}
          </div>
          {voiceFeedback && (
            <div className="mb-1.5 flex items-center justify-between rounded-xl border border-error/30 bg-error/10 px-3 py-1 text-[11px] font-jetbrains-mono text-error animate-in fade-in duration-150">
              <span>{voiceFeedback}</span>
              <button
                type="button"
                onClick={() => setVoiceFeedback(null)}
                className="text-error/70 hover:text-error ml-2 font-bold"
                aria-label="Dismiss feedback"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="mx-auto flex max-w-[680px] items-end gap-2">
          <div className="relative flex-1 min-w-0">
            {isListening ? (
              <div className="w-full min-h-[44px] max-h-28 py-2.5 px-3 rounded-2xl border border-primary/50 bg-primary/10 text-xs font-sans flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-primary animate-ping" />
                <span className="text-[11px] font-jetbrains-mono font-bold uppercase tracking-wider text-primary shrink-0">
                  Listening:
                </span>
                <span className="italic text-on-surface/80 truncate">
                  {liveSpeechText || "Speak now..."}
                </span>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Spent 500 on groceries, or 'What is my balance?'..."
                className="w-full min-h-[44px] max-h-28 py-2.5 px-3 rounded-2xl border border-outline-variant/40 bg-surface-container text-base sm:text-xs font-sans text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none resize-none touch-manipulation"
                rows={1}
              />
            )}
          </div>

          {/* Hidden receipt photo file input */}
          <input
            type="file"
            ref={receiptInputRef}
            onChange={handleReceiptCapture}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* Camera Receipt Capture Button */}
          <button
            type="button"
            onClick={() => receiptInputRef.current?.click()}
            disabled={isAiLoading}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/40 bg-surface-container hover:border-primary hover:text-primary active:scale-95 text-on-surface-variant transition-all disabled:opacity-40 shrink-0 touch-manipulation shadow-sm"
            title="Scan Receipt Photo"
            aria-label="Scan Receipt Photo"
          >
            <Camera className="h-4 w-4" />
          </button>

          {/* Import Statement / Log Button */}
          <Link
            href="/import"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-outline-variant/40 bg-surface-container hover:border-primary hover:text-primary active:scale-95 text-on-surface-variant transition-all shrink-0 touch-manipulation shadow-sm"
            title="Import Statement (.xlsx, .csv, .docx)"
            aria-label="Import Statement (.xlsx, .csv, .docx)"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </Link>

          {/* Voice Input Mic Button */}
          <VoiceInputButton
            isSupported={isSpeechSupported}
            isListening={isListening}
            onToggle={handleToggleVoice}
            disabled={isAiLoading}
          />

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={(!inputText.trim() && !isListening) || isAiLoading}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary hover:bg-primary/90 active:scale-95 text-on-primary transition-all disabled:opacity-40 shrink-0 touch-manipulation shadow-sm"
            title="Record Entry"
            aria-label="Record Entry"
          >
            {isAiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mx-auto max-w-[680px] text-center text-[10px] font-jetbrains-mono text-on-surface-variant/70 hidden sm:block pt-0.5">
          Enter to record • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
