"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Send,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Unlink,
  Clock,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

interface TelegramLinkStatus {
  isLinked: boolean;
  chatId?: string | number;
  username?: string | null;
  firstName?: string | null;
  linkedAt?: string | null;
}

export function TelegramConnectCard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [status, setStatus] = useState<TelegramLinkStatus>({ isLinked: false });

  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isCopied, setIsCopied] = useState(false);

  // Fetch linking status
  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/telegram/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.isLinked) {
          // Clear active linking code if already linked
          setLinkCode(null);
          setDeepLink(null);
        }
      }
    } catch (err) {
      console.error("Error fetching Telegram status:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Countdown timer for link code
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAt.getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining === 0) {
        setLinkCode(null);
        setDeepLink(null);
        setExpiresAt(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Poll status while waiting for user to link in Telegram
  useEffect(() => {
    if (!linkCode || status.isLinked) return;

    const pollInterval = setInterval(async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/telegram/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.isLinked) {
            setStatus(data);
            setLinkCode(null);
            setDeepLink(null);
            setExpiresAt(null);
            toast.success("Telegram connected successfully!");
          }
        }
      } catch (err) {
        // ignore polling errors
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [linkCode, status.isLinked, user]);

  const handleGenerateLinkCode = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/telegram/link-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to generate link code");
      const data = await res.json();
      setLinkCode(data.code);
      setDeepLink(data.deepLink);
      setExpiresAt(new Date(data.expiresAt));
      setTimeLeft(
        Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)
      );
      toast.success("Connection link generated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to create link code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUnlink = async () => {
    if (!user) return;
    setIsUnlinking(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/telegram/unlink", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to unlink Telegram");
      setStatus({ isLinked: false });
      setLinkCode(null);
      setDeepLink(null);
      toast.success("Telegram account disconnected.");
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect account");
    } finally {
      setIsUnlinking(false);
    }
  };

  const copyCode = () => {
    if (!linkCode) return;
    navigator.clipboard.writeText(linkCode);
    setIsCopied(true);
    toast.success("Code copied to clipboard");
    setTimeout(() => setIsCopied(false), 2500);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="rounded-xl border border-fiber-line bg-card-bg p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-fiber-line pb-2.5">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-stamp-red" />
          <h2 className="font-display text-base font-bold text-ink-text">
            Telegram Bot Register
          </h2>
        </div>

        {status.isLinked && (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-stamp-red px-2 py-0.5 border border-stamp-red/30 bg-stamp-red/5 rounded-[2px]">
            <Check className="h-3 w-3" /> Connected
          </span>
        )}
      </div>

      <p className="text-xs font-sans text-muted-text">
        Log expenses, record friend splits, and check balances on the go via Telegram.
        All entries sync instantly to your ledger.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs font-mono text-muted-text py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-stamp-red" />
          <span>Checking connection status...</span>
        </div>
      ) : status.isLinked ? (
        /* Connected State */
        <div className="pt-1 space-y-3">
          <div className="rounded-lg border border-fiber-line bg-paper-bg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-xs font-mono font-bold text-ink-text flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-stamp-red" />
                  <span>
                    {status.username ? `@${status.username}` : `Chat ID: ${status.chatId}`}
                  </span>
                </div>
                {status.firstName && (
                  <p className="text-[11px] font-sans text-muted-text">
                    Linked to {status.firstName}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono text-thrive-green">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Active Sync</span>
              </div>
            </div>

            <p className="text-[11px] font-sans text-muted-text pt-1 border-t border-fiber-line">
              Send messages directly to the bot on Telegram to log entries or check balances.
            </p>
          </div>

          <button
            onClick={handleUnlink}
            disabled={isUnlinking}
            className="h-8 px-3.5 rounded-lg border border-stamp-red/40 bg-paper-bg hover:bg-stamp-red/10 text-xs font-mono font-bold uppercase tracking-wider text-stamp-red transition-colors flex items-center gap-1.5 disabled:opacity-60"
          >
            {isUnlinking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Unlink className="h-3.5 w-3.5" />
            )}
            <span>Disconnect Telegram</span>
          </button>
        </div>
      ) : (
        /* Disconnected State */
        <div className="pt-1 space-y-3">
          {!linkCode ? (
            <div>
              <button
                onClick={handleGenerateLinkCode}
                disabled={isGenerating}
                className="h-8 px-4 rounded-lg border border-stamp-red bg-paper-bg hover:bg-stamp-red/10 text-xs font-mono font-bold uppercase tracking-wider text-stamp-red transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-60"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Connect Telegram</span>
              </button>
            </div>
          ) : (
            /* Active Linking Code State */
            <div className="rounded-lg border border-stamp-red/40 bg-paper-bg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-ink-text">
                  Complete Connection in Telegram:
                </span>
                <div className="flex items-center gap-1 text-[11px] font-mono text-stamp-red">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Expires in {formatSeconds(timeLeft)}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {deepLink && (
                  <a
                    href={deepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-3.5 rounded-lg border border-stamp-red bg-stamp-red text-white hover:bg-stamp-red/90 text-xs font-mono font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Open in Telegram</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                <button
                  onClick={copyCode}
                  className="h-8 px-3 rounded-lg border border-fiber-line bg-card-bg hover:border-stamp-red text-xs font-mono text-ink-text transition-colors inline-flex items-center gap-1.5"
                >
                  <span className="font-bold tracking-widest">{linkCode}</span>
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-stamp-red" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-muted-text" />
                  )}
                </button>
              </div>

              <p className="text-[11px] font-sans text-muted-text">
                Tap <b>Open in Telegram</b> to launch the bot with your linking code, or manually send{" "}
                <code className="px-1 py-0.5 bg-card-bg border border-fiber-line rounded text-ink-text font-mono">
                  /start {linkCode}
                </code>{" "}
                to the bot.
              </p>

              <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-muted-text">
                <Loader2 className="h-3 w-3 animate-spin text-stamp-red" />
                <span>Waiting for confirmation in Telegram...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
