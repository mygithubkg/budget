"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Zap,
  Send,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

function LoginForm() {
  const {
    user,
    loading: authLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    sendPasswordReset,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"signin" | "signup">(
    searchParams.get("tab") === "signup" ? "signup" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password modal state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (!user.emailVerified && user.providerData.some((p) => p.providerId === "password")) {
        router.replace("/verify-email");
      } else {
        router.replace("/dashboard");
      }
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
      // App layout / useEffect handles routing
    } catch (err: any) {
      console.error(err);
      let msg = "Failed to sign in. Please check your credentials.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        msg = "Invalid email or password. Please try again.";
      }
      toast.error(msg);
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
      toast.success("Account created! Please verify your email.");
      router.replace("/verify-email");
    } catch (err: any) {
      console.error(err);
      let msg = "Failed to create account.";
      if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Please sign in instead.";
      }
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      toast.success("Signed in with Google");
      router.replace("/dashboard");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Google sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error("Please enter your registered email address");
      return;
    }
    setIsSendingReset(true);
    try {
      await sendPasswordReset(resetEmail.trim());
      setResetSent(true);
      toast.success("Password reset instructions dispatched.");
    } catch (err: any) {
      // Non-revealing feedback for user privacy and security
      setResetSent(true);
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-paper-bg text-ink-text selection:bg-stamp-red/20">
      {/* LEFT PANEL: Product Preview & Ledger Mockup (Hidden on mobile, 50% on lg) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-fiber-line bg-card-bg/60 p-8 xl:p-12 relative overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#12201A_1px,transparent_1px)] [background-size:24px_24px] opacity-5 pointer-events-none" />

        {/* Top Branding */}
        <div className="relative space-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stamp-red text-[#FFFFFF] font-display font-bold text-base shadow-sm">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xl font-bold tracking-tight text-ink-text">
                FinChat
              </span>
              <span className="text-[10px] font-mono uppercase text-muted-text px-1.5 py-0.2 border border-fiber-line rounded-[3px] bg-paper-bg">
                Ledger
              </span>
            </div>
          </Link>

          <h2 className="font-display text-3xl xl:text-4xl font-bold tracking-tight text-ink-text leading-tight pt-4">
            The Ruled Account Register, <br />
            <span className="text-stamp-red italic font-serif">Reimagined for Speed.</span>
          </h2>
          <p className="text-sm font-sans text-muted-text max-w-md leading-relaxed">
            Record expenses, split shared costs with friends, and track daily running totals just by typing or talking.
          </p>
        </div>

        {/* Realistic Ledger Conversation Simulation Card */}
        <div className="relative my-8 rounded-xl border border-fiber-line bg-paper-bg shadow-sm p-5 space-y-4 max-w-lg border-l-4 border-l-stamp-red">
          {/* Top Simulated Register Header */}
          <div className="flex items-center justify-between border-b border-fiber-line pb-2 text-[10px] font-mono text-muted-text uppercase">
            <span>REGISTER FOLIO: 2026-A</span>
            <span className="text-thrive-green font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-thrive-green animate-pulse" />
              LIVE REGISTER
            </span>
          </div>

          {/* User Speech Entry */}
          <div className="flex items-start gap-2.5">
            <div className="h-6 w-6 rounded-full bg-card-bg border border-fiber-line flex items-center justify-center text-[10px] font-mono font-bold text-stamp-red shrink-0">
              YOU
            </div>
            <div className="rounded-lg bg-card-bg border border-fiber-line px-3 py-2 text-xs font-sans text-ink-text shadow-xs">
              &quot;Spent ₹1,800 on team dinner, Sam owes ₹600, Priya owes ₹600&quot;
            </div>
          </div>

          {/* Assistant Parse & Multi-Expense Ledger Breakdown */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-muted-text">
              <Sparkles className="h-3 w-3 text-thrive-green" />
              <span>PARSED & RECORDED (3 ENTRIES)</span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-card-bg/80 border border-fiber-line">
                <span className="text-ink-text">Food &amp; Dining (Your Share)</span>
                <span className="font-bold text-stamp-red">₹600.00</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-card-bg/80 border border-fiber-line">
                <span className="text-ink-text">Sam &bull; Debt Tab</span>
                <span className="font-bold text-thrive-green">+₹600.00</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-card-bg/80 border border-fiber-line">
                <span className="text-ink-text">Priya &bull; Debt Tab</span>
                <span className="font-bold text-thrive-green">+₹600.00</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-fiber-line pt-2 text-[11px] font-mono text-muted-text">
              <span>Running Ledger Total:</span>
              <span className="font-bold text-ink-text">₹42,500.00</span>
            </div>
          </div>
        </div>

        {/* Feature Pills Footer */}
        <div className="relative grid grid-cols-3 gap-3 border-t border-fiber-line pt-6 text-[11px] font-mono text-muted-text">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-stamp-red shrink-0" />
            <span>AES-256 Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-stamp-red shrink-0" />
            <span>Telegram Bot Sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-stamp-red shrink-0" />
            <span>Offline Ready PWA</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Auth Box */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Top Header */}
          <div className="text-center lg:text-left space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 group lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stamp-red text-[#FFFFFF] font-display font-bold text-base shadow-sm">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight text-ink-text">
                FinChat
              </span>
            </Link>

            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink-text">
              {activeTab === "signin" ? "Sign In to Ledger" : "Open New Register"}
            </h1>
            <p className="text-xs font-sans text-muted-text">
              {activeTab === "signin"
                ? "Enter your credentials to access your financial records."
                : "Create your personal account register in seconds."}
            </p>
          </div>

          {/* Auth Card */}
          <div className="rounded-xl border border-fiber-line bg-card-bg p-6 sm:p-8 shadow-sm">
            {/* Tab Selector */}
            <div className="flex border-b border-fiber-line pb-4 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signin");
                  setForgotPasswordOpen(false);
                }}
                className={`flex-1 text-center pb-2 text-sm font-medium transition-colors font-sans relative ${
                  activeTab === "signin" && !forgotPasswordOpen
                    ? "text-ink-text font-bold"
                    : "text-muted-text hover:text-ink-text"
                }`}
              >
                Sign In
                {activeTab === "signin" && !forgotPasswordOpen && (
                  <div className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-stamp-red" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("signup");
                  setForgotPasswordOpen(false);
                }}
                className={`flex-1 text-center pb-2 text-sm font-medium transition-colors font-sans relative ${
                  activeTab === "signup" && !forgotPasswordOpen
                    ? "text-ink-text font-bold"
                    : "text-muted-text hover:text-ink-text"
                }`}
              >
                Open Register
                {activeTab === "signup" && !forgotPasswordOpen && (
                  <div className="absolute bottom-[-17px] left-0 right-0 h-[2px] bg-stamp-red" />
                )}
              </button>
            </div>

            {forgotPasswordOpen ? (
              /* Forgot Password Form */
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-sm text-ink-text">
                    Reset Your Password
                  </h3>
                  <p className="text-xs font-sans text-muted-text">
                    Enter your email to receive password reset instructions.
                  </p>
                </div>

                {resetSent ? (
                  <div className="rounded-lg border border-fiber-line bg-paper-bg p-4 space-y-3 text-center">
                    <CheckCircle2 className="h-6 w-6 text-thrive-green mx-auto" />
                    <p className="text-xs font-sans text-ink-text">
                      If an account exists for <strong>{resetEmail}</strong>, we have dispatched a password reset link.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotPasswordOpen(false);
                        setResetSent(false);
                        setResetEmail("");
                      }}
                      className="text-xs font-mono text-stamp-red hover:underline"
                    >
                      Return to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase text-muted-text">
                        Registered Email
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full h-9 rounded-lg border border-fiber-line bg-paper-bg px-3 text-xs font-mono text-ink-text focus:border-stamp-red focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setForgotPasswordOpen(false)}
                        className="px-3 py-1.5 text-xs font-mono text-muted-text hover:text-ink-text"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSendingReset}
                        className="px-4 py-2 rounded-lg bg-stamp-red hover:bg-stamp-red/90 text-xs font-mono font-bold text-[#FFFFFF] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSendingReset && <Loader2 className="h-3 w-3 animate-spin" />}
                        Send Reset Link
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* Main Sign In / Sign Up Form */
              <div className="space-y-5">
                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-fiber-line bg-paper-bg hover:bg-card-bg px-4 py-2.5 text-xs font-medium text-ink-text transition-colors disabled:opacity-50"
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
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-fiber-line" />
                  <span className="absolute bg-card-bg px-2 text-[10px] font-mono uppercase text-muted-text">
                    or with email
                  </span>
                </div>

                <form
                  onSubmit={activeTab === "signin" ? handleSignIn : handleSignUp}
                  className="space-y-3.5"
                >
                  {activeTab === "signup" && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase text-muted-text">
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Alex Morgan"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full h-9 rounded-lg border border-fiber-line bg-paper-bg px-3 text-xs font-mono text-ink-text focus:border-stamp-red focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-muted-text">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-9 rounded-lg border border-fiber-line bg-paper-bg px-3 text-xs font-mono text-ink-text focus:border-stamp-red focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono uppercase text-muted-text">
                        Password
                      </label>
                      {activeTab === "signin" && (
                        <button
                          type="button"
                          onClick={() => {
                            setForgotPasswordOpen(true);
                            setResetEmail(email);
                          }}
                          className="text-[11px] font-mono text-stamp-red hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-9 rounded-lg border border-fiber-line bg-paper-bg px-3 pr-10 text-xs font-mono text-ink-text focus:border-stamp-red focus:outline-none"
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
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-stamp-red hover:bg-stamp-red/90 text-xs font-mono font-bold text-[#FFFFFF] py-2.5 px-4 transition-colors disabled:opacity-50 mt-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {activeTab === "signin" ? "Sign In to Ledger" : "Create My Ledger Account"}
                    </span>
                  </button>
                </form>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] font-sans text-muted-text">
            By continuing, you agree to FinChat&apos;s privacy-first accounting terms.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-paper-bg">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-text">
            <Loader2 className="h-4 w-4 animate-spin text-stamp-red" />
            Loading login...
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
