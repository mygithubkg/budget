"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, CheckCircle2, RefreshCw, LogOut, ArrowRight, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const { user, loading, checkEmailVerified, sendVerificationEmail, logout } = useAuth();
  const router = useRouter();

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Auto-polling for email verification
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
        return;
      }
      // If user is already verified, take them straight to the ledger
      if (user.emailVerified) {
        router.replace("/dashboard");
        return;
      }
    }

    const interval = setInterval(async () => {
      if (user && !user.emailVerified) {
        const verified = await checkEmailVerified();
        if (verified) {
          toast.success("Email verified successfully! Welcome to your ledger.");
          router.replace("/dashboard");
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [user, loading, router, checkEmailVerified]);

  // Resend cooldown timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const verified = await checkEmailVerified();
      if (verified) {
        toast.success("Email verified! Redirecting to your ledger...");
        router.replace("/dashboard");
      } else {
        toast.info("Verification pending. Please check your inbox and spam folder.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to check verification status");
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      await sendVerificationEmail();
      toast.success("A new verification link has been sent to your email.");
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper-bg">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-text">
          <Loader2 className="h-4 w-4 animate-spin text-stamp-indigo" />
          Loading register...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-paper-bg px-4 py-12 text-ink-text">
      <div className="w-full max-w-md space-y-6">
        {/* Ledger Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[6px] bg-stamp-indigo text-[#EDE7D6] shadow-sm">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
            Verify Your Email
          </h1>
          <p className="text-xs font-mono text-muted-text uppercase tracking-wider">
            Confirm ownership to unlock your ledger register
          </p>
        </div>

        {/* Verification Card */}
        <div className="rounded-[8px] border border-fiber-line bg-card-bg p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-stamp-indigo/10 border border-stamp-indigo/20 flex items-center justify-center text-stamp-indigo">
              <Mail className="h-8 w-8 animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm font-sans text-ink-text">
              We have dispatched a secure verification link to:
            </p>
            <p className="text-xs font-mono font-bold text-stamp-indigo px-3 py-1.5 bg-paper-bg rounded-[4px] border border-fiber-line inline-block break-all">
              {user?.email}
            </p>
            <p className="text-xs font-sans text-muted-text pt-2 leading-relaxed">
              Click the link in your email to activate your account. Once verified, this page will automatically advance.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-2 rounded-[6px] bg-stamp-indigo hover:bg-stamp-indigo/90 text-xs font-mono font-bold text-[#EDE7D6] py-2.5 px-4 transition-colors disabled:opacity-50"
            >
              {isChecking ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              <span>I Have Verified My Email</span>
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className="w-full flex items-center justify-center gap-2 rounded-[6px] border border-fiber-line bg-paper-bg hover:bg-card-bg text-xs font-mono text-ink-text py-2 px-4 transition-colors disabled:opacity-50"
            >
              {isResending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span>
                {resendCooldown > 0
                  ? `Resend available in ${resendCooldown}s`
                  : "Resend Verification Email"}
              </span>
            </button>
          </div>

          <div className="border-t border-fiber-line pt-4 flex items-center justify-between text-xs font-mono text-muted-text">
            <span>Wrong email?</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-rule-red hover:underline flex items-center gap-1"
            >
              <LogOut className="h-3 w-3" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
