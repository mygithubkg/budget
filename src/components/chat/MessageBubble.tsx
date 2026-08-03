"use client";

import React from "react";
import { ChatMessage, ParsedExpense } from "@/types";
import { ConfirmationCard } from "./ConfirmationCard";
import { StatusQueryCard } from "./StatusQueryCard";
import {
  Bot,
  User,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: ChatMessage;
  currency?: string;
  onConfirm: (messageId: string, finalList: ParsedExpense[]) => Promise<void>;
  onCancel: (messageId: string) => void;
  onRetry?: (text: string) => void;
  isSaving?: boolean;
}

export function MessageBubble({
  message,
  currency = "INR",
  onConfirm,
  onCancel,
  onRetry,
  isSaving,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  const messageDate =
    message.createdAt instanceof Date
      ? message.createdAt
      : typeof message.createdAt === "number"
      ? new Date(message.createdAt)
      : new Date();

  const formattedTime = format(messageDate, "h:mm a");

  if (isUser) {
    return (
      <div className="flex w-full justify-end gap-2.5 my-2.5 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
        <div className="flex max-w-[85%] sm:max-w-md flex-col items-end">
          <div className="rounded-2xl rounded-tr-sm bg-gradient-to-tr from-indigo-600 to-indigo-500 px-4 py-2.5 text-sm text-white shadow-md shadow-indigo-500/15 leading-relaxed">
            {message.content}
          </div>
          <span className="mt-1 text-[10px] text-muted-foreground px-1">
            {formattedTime}
          </span>
        </div>
        <Avatar className="h-8 w-8 shrink-0 border border-indigo-500/30">
          <AvatarFallback className="bg-indigo-600 text-white text-xs">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  const hasTransactionsToConfirm =
    (message.parsedTransactions && message.parsedTransactions.length > 0) ||
    Boolean(message.parsedData);

  return (
    <div className="flex w-full justify-start gap-2.5 my-2.5 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
      <Avatar className="h-8 w-8 shrink-0 border border-primary/20 bg-primary/10">
        <AvatarFallback className="bg-gradient-to-tr from-indigo-500 to-purple-500 text-white text-xs">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>

      <div className="flex max-w-[90%] sm:max-w-lg flex-col items-start space-y-2">
        {/* Case 1: Pending transaction(s) confirmation card */}
        {hasTransactionsToConfirm && message.status === "pending_confirmation" ? (
          <ConfirmationCard
            transactions={message.parsedTransactions || undefined}
            parsedData={message.parsedData || undefined}
            currency={currency}
            onConfirm={(finalList) => onConfirm(message.id, finalList)}
            onCancel={() => onCancel(message.id)}
            isSaving={isSaving}
          />
        ) : message.status === "status_query" && message.statusData ? (
          /* Case 2: Status Query Result (Balance / Recent Tx / Friend Debts / Summary) */
          <div className="w-full rounded-2xl rounded-tl-sm bg-card border border-border/80 p-4 text-sm text-foreground shadow-sm space-y-2 leading-relaxed">
            {message.content && (
              <p className="font-medium text-foreground whitespace-pre-wrap">
                {message.content}
              </p>
            )}
            <StatusQueryCard statusData={message.statusData} currency={currency} />
          </div>
        ) : message.status === "off_topic" ? (
          /* Case 3: Off-topic canned guardrail message */
          <div className="rounded-2xl rounded-tl-sm border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-500 dark:text-amber-400 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-600 dark:text-amber-300">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>FinChat Focus Notice</span>
            </div>
            <p>{message.content}</p>
          </div>
        ) : message.status === "error" ? (
          /* Case 4: Error response */
          <div className="rounded-2xl rounded-tl-sm border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{message.content || "Could not process request."}</span>
            </div>
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-destructive/40 hover:bg-destructive/10 text-destructive"
                onClick={() => onRetry(message.content)}
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </Button>
            )}
          </div>
        ) : (
          /* Case 5: Normal assistant text or confirmed summary */
          <div className="rounded-2xl rounded-tl-sm bg-card border border-border/80 px-4 py-2.5 text-sm text-foreground shadow-sm leading-relaxed">
            {message.status === "confirmed" && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 mb-1">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Transaction(s) Logged</span>
              </div>
            )}
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        <span className="text-[10px] text-muted-foreground px-1">
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
