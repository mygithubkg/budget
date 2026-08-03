"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BookOpen, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { user, loading: authLoading, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/chat");
    }
  }, [user, authLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithEmail(email, password);
      toast.success("Welcome back to your ledger");
      router.replace("/chat");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    setIsSubmitting(true);
    try {
      await signUpWithEmail(email, password, displayName);
      toast.success("Ledger account created successfully");
      router.replace("/chat");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      toast.success("Signed in with Google");
      router.replace("/chat");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Google sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-paper-bg px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Ledger Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-[6px] bg-stamp-indigo text-[#EDE7D6] shadow-sm">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-text">
            FinChat
          </h1>
          <p className="text-xs font-mono text-muted-text uppercase tracking-wider">
            Ruled Account Register & Expense Tracker
          </p>
        </div>

        {/* Ledger Authentication Card */}
        <div className="rounded-[8px] border border-fiber-line bg-card-bg p-6 sm:p-8 shadow-sm">
          {/* Tab Selector */}
          <div className="flex border-b border-fiber-line pb-4 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab("signin")}
              className={`flex-1 text-center pb-2 text-sm font-medium transition-colors font-sans relative ${
                activeTab === "signin"
                  ? "text-ink-text font-bold"
                  : "text-muted-text hover:text-ink-text"
              }`}
            >
              Sign In
              {activeTab === "signin" && (
                <div className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-rule-red" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("signup")}
              className={`flex-1 text-center pb-2 text-sm font-medium transition-colors font-sans relative ${
                activeTab === "signup"
                  ? "text-ink-text font-bold"
                  : "text-muted-text hover:text-ink-text"
              }`}
            >
              Open New Register
              {activeTab === "signup" && (
                <div className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-rule-red" />
              )}
            </button>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2.5 rounded-[6px] border border-fiber-line bg-paper-bg hover:bg-card-bg px-4 py-2.5 text-xs font-medium text-ink-text transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="w-full border-t border-fiber-line" />
            <span className="relative bg-card-bg px-3 text-[10px] font-mono uppercase text-muted-text tracking-widest">
              or credentials
            </span>
          </div>

          {/* Forms */}
          {activeTab === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-muted-text tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bookkeeper@ledger.com"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-[6px] border border-fiber-line bg-paper-bg px-3 py-2 text-xs text-ink-text placeholder:text-muted-text/60 focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-muted-text tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-[6px] border border-fiber-line bg-paper-bg px-3 py-2 pr-9 text-xs text-ink-text placeholder:text-muted-text/60 focus:border-stamp-indigo focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-text hover:text-ink-text"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-[6px] bg-stamp-indigo hover:bg-stamp-indigo/90 px-4 py-2.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#EDE7D6] transition-colors disabled:opacity-50 mt-2"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Sign In
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-muted-text tracking-wider">
                  Account Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Primary Account"
                  disabled={isSubmitting}
                  className="w-full rounded-[6px] border border-fiber-line bg-paper-bg px-3 py-2 text-xs text-ink-text placeholder:text-muted-text/60 focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-muted-text tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bookkeeper@ledger.com"
                  required
                  disabled={isSubmitting}
                  className="w-full rounded-[6px] border border-fiber-line bg-paper-bg px-3 py-2 text-xs text-ink-text placeholder:text-muted-text/60 focus:border-stamp-indigo focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono uppercase text-muted-text tracking-wider">
                  Password (min. 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-[6px] border border-fiber-line bg-paper-bg px-3 py-2 pr-9 text-xs text-ink-text placeholder:text-muted-text/60 focus:border-stamp-indigo focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-text hover:text-ink-text"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-[6px] bg-stamp-indigo hover:bg-stamp-indigo/90 px-4 py-2.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#EDE7D6] transition-colors disabled:opacity-50 mt-2"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create Account
              </button>
            </form>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="text-center">
          <p className="text-[11px] text-muted-text font-mono">
            Ruled records · Strict privacy & security
          </p>
        </div>
      </div>
    </div>
  );
}
