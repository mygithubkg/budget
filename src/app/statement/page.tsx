"use client";

import React, { useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { format } from "date-fns";
import {
  Receipt,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

export interface StatementPayload {
  owner: string;
  friend: string;
  currency: string;
  balance: number;
  upiId?: string;
  generatedAt: string;
  entries: {
    id?: string;
    note: string;
    amount: number;
    type: "owe" | "borrow" | "settle";
    direction?: "they_owe_me" | "i_owe_them";
    date: string;
  }[];
}

function safeBase64Decode<T>(rawInput: string): T | null {
  if (!rawInput) return null;
  let cleanInput = rawInput.trim();
  try {
    if (cleanInput.includes("%")) {
      try {
        cleanInput = decodeURIComponent(cleanInput);
      } catch {}
    }
    if (cleanInput.startsWith("{") || cleanInput.startsWith("[")) {
      return JSON.parse(cleanInput) as T;
    }
    let base64 = cleanInput.replace(/ /g, "+").replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (m) => m.charCodeAt(0));
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr) as T;
  } catch (e1) {
    try {
      let base64 = cleanInput.replace(/ /g, "+").replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4 !== 0) {
        base64 += "=";
      }
      const jsonStr = decodeURIComponent(escape(atob(base64)));
      return JSON.parse(jsonStr) as T;
    } catch (e2) {
      try {
        const decodedUri = decodeURIComponent(rawInput);
        return JSON.parse(decodedUri) as T;
      } catch (e3) {
        console.error("Failed to decode statement payload:", e3);
        return null;
      }
    }
  }
}

function StatementContent() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get("id");
  const rawData = searchParams.get("d");
  const [statement, setStatement] = React.useState<StatementPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  // Suppress third-party browser extension errors (e.g. crypto wallets, injection scripts)
  React.useEffect(() => {
    const handleExtensionError = (event: ErrorEvent) => {
      const msg = event.message || "";
      const fn = event.filename || "";
      if (
        msg.includes("location") ||
        msg.includes("Crypto") ||
        msg.includes("Injection") ||
        msg.includes("injected") ||
        msg.includes("runInjection") ||
        fn.includes("extension") ||
        fn.includes("chrome-extension") ||
        fn.includes("moz-extension")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason || "");
      if (
        reason.includes("Injection") ||
        reason.includes("injected") ||
        reason.includes("extension")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("error", handleExtensionError, true);
    window.addEventListener("unhandledrejection", handleRejection, true);
    return () => {
      window.removeEventListener("error", handleExtensionError, true);
      window.removeEventListener("unhandledrejection", handleRejection, true);
    };
  }, []);

  // Fetch or decode statement
  React.useEffect(() => {
    let isMounted = true;

    async function loadStatement() {
      setIsLoading(true);

      // Priority 1: Short ID from server/Firestore
      if (rawId) {
        try {
          const res = await fetch(`/api/statement?id=${encodeURIComponent(rawId)}`);
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setStatement(data);
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {
          console.error("Failed to fetch statement by id:", e);
        }
      }

      // Priority 2: Base64 payload in 'd' parameter
      if (rawData) {
        const decoded = safeBase64Decode<StatementPayload>(rawData);
        if (isMounted) {
          setStatement(decoded);
          setIsLoading(false);
          return;
        }
      }

      if (isMounted) {
        setStatement(null);
        setIsLoading(false);
      }
    }

    loadStatement();

    return () => {
      isMounted = false;
    };
  }, [rawId, rawData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-[24px] bg-[#11131A] border border-white/[0.08] p-8 text-center space-y-4 shadow-2xl animate-pulse">
          <div className="h-12 w-12 rounded-full bg-indigo-500/20 mx-auto" />
          <div className="h-5 w-48 bg-white/10 rounded mx-auto" />
          <div className="h-3 w-32 bg-white/5 rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#090A0F] text-[#F8FAFC]">
        <div className="max-w-md w-full rounded-[24px] bg-[#11131A] border border-white/[0.08] p-8 text-center space-y-4 shadow-2xl">
          <div className="h-14 w-14 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
            <Receipt className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold">Invalid or Expired Statement</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The statement link you opened appears to be corrupted or expired. Please request a new link from the sender.
          </p>
        </div>
      </div>
    );
  }

  const { owner, friend, currency, balance, upiId, generatedAt, entries = [] } = statement;

  const friendOwes = balance > 0;
  const isSettled = balance === 0;

  const handleCopyLink = () => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(window.location?.href || window.location?.toString() || "");
      setCopied(true);
      toast.success("Statement link copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined" && window.print) {
      window.print();
    }
  };

  const formattedGeneratedDate = generatedAt
    ? format(new Date(generatedAt), "MMM dd, yyyy • h:mm a")
    : format(new Date(), "MMM dd, yyyy");

  return (
    <div className="relative z-10 min-h-screen bg-[#090A0F] text-[#F8FAFC] font-sans antialiased py-6 sm:py-12 px-3 sm:px-6 selection:bg-indigo-500/30">
      <div className="max-w-xl mx-auto space-y-4">
        {/* Brand / Top Nav */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center shadow-lg text-white font-bold text-xs">
              FC
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white">FinChat</span>
              <span className="text-[10px] text-slate-400 ml-1.5 font-mono uppercase tracking-wider">
                Shared Statement
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="h-8 px-3 rounded-full bg-white/[0.06] hover:bg-white/[0.1] active:scale-95 border border-white/[0.08] text-xs text-slate-300 flex items-center gap-1.5 transition-all print:hidden"
              title="Print / Save PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="h-8 px-3 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30 print:hidden"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy Link"}</span>
            </button>
          </div>
        </div>

        {/* Hero Card */}
        <div className="relative overflow-hidden rounded-[28px] bg-[#11131A] border border-white/[0.08] p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
                Shared Balance Summary
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
                {friend} & {owner}
              </h1>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Generated by {owner} on {formattedGeneratedDate}</span>
              </p>
            </div>

            {/* Status Pill */}
            <div className="flex-shrink-0">
              {isSettled ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  All Settled
                </span>
              ) : friendOwes ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold font-mono uppercase tracking-wider">
                  <ArrowDownLeft className="h-4 w-4" />
                  Payment Due
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold font-mono uppercase tracking-wider">
                  <ArrowUpRight className="h-4 w-4" />
                  Credit Due to {friend}
                </span>
              )}
            </div>
          </div>

          {/* Amount Due Big Display */}
          <div className="relative z-10 space-y-2">
            <p className="text-xs font-medium text-slate-400">
              {isSettled
                ? "No outstanding debts between you two."
                : friendOwes
                ? `${friend} owes ${owner}:`
                : `${owner} owes ${friend}:`}
            </p>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-4xl sm:text-5xl font-extrabold font-mono tracking-tight ${
                  isSettled
                    ? "text-slate-300"
                    : friendOwes
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {formatCurrency(Math.abs(balance), currency)}
              </span>
            </div>
          </div>

          {/* UPI Pay CTA (if applicable) */}
          {upiId && friendOwes && balance > 0 && (
            <div className="relative z-10 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="space-y-0.5 text-center sm:text-left">
                <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 justify-center sm:justify-start">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  Direct UPI Settlement
                </p>
                <p className="text-[11px] font-mono text-slate-300">
                  Pay to: <span className="font-bold text-white">{upiId}</span>
                </p>
              </div>

              <a
                href={`upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
                  owner
                )}&am=${Math.abs(balance)}&cu=INR`}
                className="w-full sm:w-auto h-9 px-5 rounded-full bg-indigo-500 hover:bg-indigo-400 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <span>Pay via UPI App</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Itemized Transaction History */}
        <div className="rounded-[28px] bg-[#11131A] border border-white/[0.08] p-5 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 px-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Itemized Activity ({entries.length})
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              Chronological ledger
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Receipt className="h-7 w-7 text-slate-500 mx-auto opacity-50" />
              <p className="text-xs font-semibold text-slate-300">No individual transaction items attached</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                This link was generated as a summary statement. To view full transaction line items, re-generate the statement from your account.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {entries.map((entry, idx) => {
                const isSettle = entry.type === "settle";
                const isDebit = entry.type === "borrow" || entry.direction === "i_owe_them";
                const isCredit = !isSettle && !isDebit;

                let entryDate = "Recent";
                if (entry.date) {
                  try {
                    const parsed = new Date(entry.date);
                    if (!isNaN(parsed.getTime())) {
                      entryDate = format(parsed, "MMM dd, yyyy");
                    }
                  } catch {}
                }

                return (
                  <div
                    key={entry.id || idx}
                    className="py-3.5 px-1 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors rounded-xl"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                            isSettle
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : isCredit
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {isSettle ? "Settlement" : isCredit ? `${friend}'s Share` : `${owner}'s Share`}
                        </span>
                        <p className="text-xs sm:text-sm font-medium text-white truncate">
                          {entry.note || (isSettle ? "Settled Balance" : "Shared Expense")}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        {entryDate}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`font-mono font-bold text-sm sm:text-base tabular-nums ${
                          isSettle
                            ? "text-indigo-400"
                            : isCredit
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {isSettle ? "✓ " : isCredit ? "+" : "−"}
                        {formatCurrency(entry.amount, currency)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4 space-y-1 text-slate-500 text-xs">
          <p>
            Powered by{" "}
            <a
              href="/"
              className="text-indigo-400 hover:underline font-semibold"
            >
              FinChat
            </a>{" "}
            • Real-time Ledger & Shared Expense Tracker
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StatementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090A0F] flex items-center justify-center text-slate-400 font-mono text-xs">
          Loading statement...
        </div>
      }
    >
      <StatementContent />
    </Suspense>
  );
}
