"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Friend, FriendLedgerEntry } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  QrCode,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { StatementPayload } from "@/app/statement/page";

interface ShareStatementModalProps {
  friend: Friend;
  ledgerEntries: FriendLedgerEntry[];
  isLoading?: boolean;
  currency: string;
  userName: string;
  upiId?: string;
  open: boolean;
  onClose: () => void;
}

function safeBase64Encode(payload: any): string {
  try {
    const jsonStr = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(jsonStr);
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    const base64 = btoa(binString);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (err) {
    try {
      const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch {
      return encodeURIComponent(JSON.stringify(payload));
    }
  }
}

export function ShareStatementModal({
  friend,
  ledgerEntries,
  isLoading = false,
  currency,
  userName,
  upiId,
  open,
  onClose,
}: ShareStatementModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [shortId, setShortId] = useState<string | null>(null);

  const [isGeneratingShortId, setIsGeneratingShortId] = useState(false);

  // Construct standard payload
  const payload: StatementPayload = useMemo(() => {
    return {
      owner: userName || "Account Holder",
      friend: friend.name,
      currency,
      balance: friend.balance,
      upiId: upiId || undefined,
      generatedAt: new Date().toISOString(),
      entries: (ledgerEntries || []).slice(0, 100).map((e) => ({
        id: e.id,
        note: e.note || (e.type === "settle" ? "Settlement" : "Shared expense"),
        amount: Number(e.amount) || 0,
        type: e.type,
        direction: e.direction,
        date:
          e.date instanceof Date
            ? e.date.toISOString()
            : String(e.date || new Date().toISOString()),
      })),
    };
  }, [userName, friend.name, friend.balance, currency, upiId, ledgerEntries]);

  // Generate short ID via API on open once loading is complete
  useEffect(() => {
    if (!open) {
      setShortId(null);
      return;
    }

    if (isLoading) {
      return;
    }

    let isMounted = true;
    setIsGeneratingShortId(true);

    async function createShortLink() {
      try {
        const res = await fetch("/api/statement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.id) {
            setShortId(data.id);
          }
        }
      } catch (err) {
        console.warn("Failed to generate short ID, falling back to embedded URL:", err);
      } finally {
        if (isMounted) {
          setIsGeneratingShortId(false);
        }
      }
    }

    createShortLink();

    return () => {
      isMounted = false;
    };
  }, [open, isLoading, friend.id, ledgerEntries.length]);

  // Generate URL & Message Payload
  const { shareUrl, shareText } = useMemo(() => {
    if (!open) return { shareUrl: "", shareText: "" };

    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://finchat.app";

    const url = shortId
      ? `${origin}/statement?id=${shortId}`
      : `${origin}/statement?d=${safeBase64Encode(payload)}`;

    // Prepare human-friendly WhatsApp text
    const owesYou = friend.balance > 0;
    const youOwe = friend.balance < 0;
    const isSettled = friend.balance === 0;

    let text = `🧾 *Shared Ledger Statement with ${friend.name}*\n`;
    text += `_From: ${userName}_\n\n`;

    if (ledgerEntries.length > 0) {
      text += `*Recent Activity:*\n`;
      ledgerEntries.slice(0, 6).forEach((entry) => {
        const entryDate =
          entry.date instanceof Date
            ? format(entry.date, "MMM dd")
            : "Recent";
        const sign = entry.type === "settle" ? "✓" : entry.type === "borrow" ? "−" : "+";
        text += `• ${entry.note || "Expense"} (${entryDate}): ${sign}${formatCurrency(entry.amount, currency)}\n`;
      });
      if (ledgerEntries.length > 6) {
        text += `• ...and ${ledgerEntries.length - 6} more entries\n`;
      }
      text += `\n`;
    }

    if (isSettled) {
      text += `✅ *All accounts are completely settled up!*\n\n`;
    } else if (owesYou) {
      text += `💰 *Amount Due:* ${friend.name} owes *${formatCurrency(friend.balance, currency)}*\n\n`;
    } else {
      text += `💸 *Amount Payable:* ${userName} owes ${friend.name} *${formatCurrency(Math.abs(friend.balance), currency)}*\n\n`;
    }

    text += `🔗 *View complete statement online:*\n${url}`;

    return { shareUrl: url, shareText: text };
  }, [open, shortId, payload, friend, ledgerEntries, currency, userName]);

  if (!open) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success("Statement link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    toast.success("Summary text copied to clipboard");
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      shareText
    )}`;
    window.open(waUrl, "_blank");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Shared Statement for ${friend.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (e) {
        // User dismissed share dialog
      }
    } else {
      handleCopyLink();
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] bg-card-bg dark:bg-[#11131A] border border-fiber-line dark:border-white/[0.08] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-fiber-line dark:border-white/[0.06] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-md-primary/20 text-md-primary flex items-center justify-center">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display sm:font-inter text-base font-bold text-ink-text dark:text-white">
                Share Statement with {friend.name}
              </h3>
              <p className="text-[11px] font-mono text-muted-text">
                Includes itemized transactions & net amount
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-paper-bg-subtle dark:hover:bg-white/[0.06] text-muted-text hover:text-ink-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Balance Preview Card */}
        <div className="rounded-[20px] bg-paper-bg dark:bg-[#181B24] border border-fiber-line dark:border-white/[0.06] p-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-muted-text uppercase tracking-wider">
              {friend.balance > 0
                ? "Net to Receive"
                : friend.balance < 0
                ? "Net to Pay"
                : "Status"}
            </p>
            <p
              className={`text-xl font-bold font-jetbrains-mono mt-0.5 tabular-nums ${
                friend.balance > 0
                  ? "text-md-tertiary"
                  : friend.balance < 0
                  ? "text-md-error"
                  : "text-ink-text dark:text-white"
              }`}
            >
              {formatCurrency(Math.abs(friend.balance), currency)}
            </p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-fiber-line dark:border-white/[0.08] text-muted-text flex items-center gap-1.5">
            {isLoading ? (
              <>
                <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                <span>Loading activity...</span>
              </>
            ) : (
              `${ledgerEntries.length} record${ledgerEntries.length === 1 ? "" : "s"}`
            )}
          </span>
        </div>

        {/* Message Preview Box */}
        <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
          <label className="text-[11px] font-mono uppercase tracking-wider text-muted-text px-1 flex items-center justify-between">
            <span>Message Preview</span>
            {isLoading && <span className="text-[10px] text-indigo-400 font-mono">Syncing ledger...</span>}
          </label>
          <div className="flex-1 overflow-y-auto rounded-[16px] bg-paper-bg/60 dark:bg-black/30 border border-fiber-line dark:border-white/[0.06] p-3 text-xs font-mono text-ink-text dark:text-slate-300 whitespace-pre-wrap select-all leading-relaxed max-h-40 sm:max-h-48">
            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-muted-text">
                <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">Fetching latest ledger transactions...</span>
              </div>
            ) : (
              shareText
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {/* WhatsApp Primary CTA */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleWhatsAppShare}
            className="w-full h-11 rounded-full bg-[#25D366] hover:bg-[#20BD5A] disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-white font-bold text-xs font-inter flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{isLoading ? "Preparing Statement..." : "Send on WhatsApp"}</span>
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleCopyLink}
              className="h-10 rounded-full border border-fiber-line dark:border-white/[0.08] bg-paper-bg dark:bg-white/[0.04] hover:bg-paper-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-ink-text dark:text-slate-200 text-xs font-semibold font-inter flex items-center justify-center gap-1.5 transition-all"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-md-tertiary" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? "Copied" : "Copy Link"}</span>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleCopyText}
              className="h-10 rounded-full border border-fiber-line dark:border-white/[0.08] bg-paper-bg dark:bg-white/[0.04] hover:bg-paper-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-ink-text dark:text-slate-200 text-xs font-semibold font-inter flex items-center justify-center gap-1.5 transition-all"
            >
              {copiedText ? <Check className="h-3.5 w-3.5 text-md-tertiary" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedText ? "Copied" : "Copy Text"}</span>
            </button>

            {hasNativeShare ? (
              <button
                type="button"
                disabled={isLoading}
                onClick={handleNativeShare}
                className="col-span-2 sm:col-span-1 h-10 rounded-full border border-fiber-line dark:border-white/[0.08] bg-paper-bg dark:bg-white/[0.04] hover:bg-paper-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-ink-text dark:text-slate-200 text-xs font-semibold font-inter flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>More Share</span>
              </button>
            ) : (
              <a
                href={isLoading ? "#" : shareUrl}
                target={isLoading ? "_self" : "_blank"}
                rel="noreferrer"
                className={`col-span-2 sm:col-span-1 h-10 rounded-full border border-fiber-line dark:border-white/[0.08] bg-paper-bg dark:bg-white/[0.04] hover:bg-paper-bg-subtle active:scale-95 text-ink-text dark:text-slate-200 text-xs font-semibold font-inter flex items-center justify-center gap-1.5 transition-all ${
                  isLoading ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Preview</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareStatementModal;
