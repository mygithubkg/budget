"use client";

import React from "react";
import { ChatMessage, ParsedExpense } from "@/types";
import { ConfirmationCard } from "./ConfirmationCard";
import { StatusQueryCard } from "./StatusQueryCard";
import { RecapCard } from "./RecapCard";
import { MultiLogStamps, LogStamp } from "./LogStamp";
import {
  AlertCircle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
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
  const formattedDate = format(messageDate, "MMM d, yyyy");

  // User Message: Entry Stub Card (thin top rule showing date, right aligned)
  if (isUser) {
    return (
      <div className="flex w-full justify-end my-3">
        <div className="flex max-w-[85%] sm:max-w-md flex-col items-end">
          <div className="rounded-[6px] border border-fiber-line bg-card-bg px-4 py-2.5 shadow-sm text-xs font-sans text-ink-text leading-relaxed w-full">
            <div className="flex items-center justify-between border-b border-fiber-line pb-1.5 mb-1.5 text-[10px] font-mono text-muted-text uppercase tracking-wider">
              <span>Entry Memo</span>
              <span>{formattedTime}</span>
            </div>
            {message.imageUrl && (
              <div className="mb-2 overflow-hidden rounded-[4px] border border-fiber-line max-w-[200px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.imageUrl}
                  alt="Receipt thumbnail"
                  className="max-h-40 w-full object-cover rounded-[3px]"
                />
              </div>
            )}
            <p className="text-ink-text font-normal">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasTransactionsToConfirm =
    (message.parsedTransactions && message.parsedTransactions.length > 0) ||
    Boolean(message.parsedData);

  return (
    <div className="flex w-full justify-start my-3">
      <div className="flex w-full max-w-full flex-col items-start space-y-1.5">
        {/* Case 0: Proactive Weekly / Monthly Recap */}
        {message.messageType === "recap" ? (
          <RecapCard
            content={message.content}
            recapData={message.recapData}
            currency={currency}
          />
        ) : hasTransactionsToConfirm && message.status === "pending_confirmation" ? (
          <ConfirmationCard
            transactions={message.parsedTransactions || undefined}
            parsedData={message.parsedData || undefined}
            currency={currency}
            onConfirm={(finalList) => onConfirm(message.id, finalList)}
            onCancel={() => onCancel(message.id)}
            isSaving={isSaving}
          />
        ) : message.status === "status_query" && message.statusData ? (
          /* Case 2: Status Query Result (Ledger Ruled Card) */
          <div className="w-full rounded-[6px] border border-fiber-line bg-card-bg p-4 text-xs text-ink-text shadow-sm space-y-2 leading-relaxed">
            {message.content && (
              <p className="font-medium text-ink-text whitespace-pre-wrap pb-1">
                {message.content}
              </p>
            )}
            <StatusQueryCard statusData={message.statusData} currency={currency} />
          </div>
        ) : message.status === "off_topic" ? (
          /* Case 3: Off-topic canned guardrail message */
          <div className="rounded-[6px] border border-rule-red/40 bg-card-bg p-3 text-xs text-ink-text space-y-1 leading-relaxed">
            <div className="flex items-center gap-1.5 font-mono uppercase text-[10px] text-rule-red font-bold tracking-wider">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>FinChat Focus Notice</span>
            </div>
            <p className="text-muted-text">{message.content}</p>
          </div>
        ) : message.status === "error" ? (
          /* Case 4: Error response */
          <div className="rounded-[6px] border border-rule-red/50 bg-card-bg p-3 text-xs text-rule-red space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{message.content || "Could not process ledger entry."}</span>
            </div>
            {onRetry && (
              <button
                className="inline-flex items-center gap-1 text-[11px] font-mono uppercase font-bold text-stamp-indigo hover:underline"
                onClick={() => onRetry(message.content)}
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            )}
          </div>
        ) : (
          /* Case 5: Normal assistant text or confirmed summary with Signature Stamp */
          <div className="w-full space-y-2">
            {message.status === "confirmed" && (
              <div className="py-1">
                {message.parsedTransactions && message.parsedTransactions.length > 0 ? (
                  <MultiLogStamps
                    items={message.parsedTransactions.map((t) => ({
                      amount: t.totalAmount,
                      category: t.category,
                      type: t.type,
                    }))}
                    currency={currency}
                  />
                ) : message.parsedData ? (
                  <LogStamp
                    amount={message.parsedData.totalAmount}
                    category={message.parsedData.category}
                    type={message.parsedData.type}
                    currency={currency}
                  />
                ) : null}
              </div>
            )}
            {/* Plain margin-note style text in IBM Plex Sans */}
            <div className="text-xs font-sans text-ink-text leading-relaxed pl-1">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        )}

        <span className="text-[10px] font-mono text-muted-text pl-1">
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
