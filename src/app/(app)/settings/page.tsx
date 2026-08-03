"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import {
  Settings as SettingsIcon,
  Coins,
  Palette,
  User,
  ShieldCheck,
  LogOut,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { userProfile, updateCurrency, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [currency, setCurrency] = useState(userProfile?.currency || "INR");
  const [isUpdatingCurrency, setIsUpdatingCurrency] = useState(false);

  const handleCurrencyChange = async (newVal: string) => {
    setCurrency(newVal);
    setIsUpdatingCurrency(true);
    try {
      await updateCurrency(newVal);
      toast.success(`Currency updated to ${newVal}`);
    } catch (err: any) {
      toast.error("Failed to update currency preference");
    } finally {
      setIsUpdatingCurrency(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Account & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage your currency, app theme, and account settings.
        </p>
      </div>

      <div className="space-y-6">
        {/* User Profile Card */}
        <Card className="border-border/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>User Profile</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Your account details managed via Firebase Authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                  {getInitials(userProfile?.displayName)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-base">
                    {userProfile?.displayName || "User"}
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    Free Plan
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{userProfile?.email}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Authenticated Account</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency & Financial Preferences */}
        <Card className="border-border/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <span>Currency & Localization</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Select the currency used across all dashboards, charts, and AI transaction summaries.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="currency-select">Default Currency</Label>
              <Select
                value={currency}
                onValueChange={handleCurrencyChange}
                disabled={isUpdatingCurrency}
              >
                <SelectTrigger id="currency-select" className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-mono font-bold mr-2">{c.symbol}</span>
                      <span>{c.name} ({c.code})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Theme */}
        <Card className="border-border/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <span>Appearance</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Customize the look and feel of the FinChat interface.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center justify-between rounded-xl border p-3.5 text-xs font-semibold transition-all ${
                  theme === "dark"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
              >
                <div className="h-6 w-6 rounded-full bg-slate-900 border border-slate-700 mb-2 shadow-xs" />
                <span>Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center justify-between rounded-xl border p-3.5 text-xs font-semibold transition-all ${
                  theme === "light"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
              >
                <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-300 mb-2 shadow-xs" />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center justify-between rounded-xl border p-3.5 text-xs font-semibold transition-all ${
                  theme === "system"
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground"
                }`}
              >
                <div className="h-6 w-6 rounded-full bg-gradient-to-r from-slate-900 to-slate-100 border border-slate-400 mb-2 shadow-xs" />
                <span>System</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out Card */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>Session & Sign Out</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Log out of your FinChat account on this browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
