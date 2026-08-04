"use client";

import React, { useState, useEffect } from "react";
import { Download, Share, X, CheckCircle, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;

    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      return;
    }

    // Check localStorage dismissal
    const dismissed = localStorage.getItem("finchat_pwa_install_dismissed");
    if (!dismissed) {
      setIsDismissed(false);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" &&
        window.navigator.maxTouchPoints > 1);

    setIsIOS(isIosDevice);

    // Chrome / Edge / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissed) {
        setIsDismissed(false);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      localStorage.setItem("finchat_pwa_install_dismissed", "true");
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setIsDismissed(true);
      localStorage.setItem("finchat_pwa_install_dismissed", "true");
    } catch (err) {
      console.error("Install prompt error:", err);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem("finchat_pwa_install_dismissed", "true");
  };

  // If already standalone, or user dismissed, or neither prompt nor iOS
  if (isStandalone || isDismissed) {
    return null;
  }

  // Chrome/Android prompt available
  if (deferredPrompt) {
    return (
      <aside
        aria-label="Install App"
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100%-2rem)] bg-paper-card border border-stamp-indigo/30 shadow-ledger rounded-lg p-4 animate-fadeIn"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-stamp-indigo/10 border border-stamp-indigo/20 flex items-center justify-center flex-shrink-0 text-stamp-indigo mt-0.5">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-text font-serif">
                Install FinChat App
              </p>
              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                Add to your home screen or desktop for instant ledger logging
                and offline access.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="text-ink-muted hover:text-ink-text p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-fiber-line/60">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink-text transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stamp-indigo hover:bg-stamp-indigo-hover text-white rounded text-xs font-medium transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Install App
          </button>
        </div>
      </aside>
    );
  }

  // iOS Safari manual instruction banner
  if (isIOS) {
    return (
      <aside
        aria-label="Install App on iOS"
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100%-2rem)] bg-paper-card border border-stamp-indigo/30 shadow-ledger rounded-lg p-4 animate-fadeIn"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-stamp-indigo/10 border border-stamp-indigo/20 flex items-center justify-center flex-shrink-0 text-stamp-indigo mt-0.5">
              <Share className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-text font-serif">
                Add to Home Screen
              </p>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                Tap the <span className="font-medium text-ink-text">Share</span>{" "}
                icon in Safari, then select{" "}
                <span className="font-semibold text-stamp-indigo">
                  &apos;Add to Home Screen&apos;
                </span>
                .
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss instruction"
            className="text-ink-muted hover:text-ink-text p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex justify-end mt-3 pt-2 border-t border-fiber-line/60">
          <button
            onClick={handleDismiss}
            className="px-3.5 py-1.5 bg-paper-rule hover:bg-fiber-line text-ink-text rounded text-xs font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </aside>
    );
  }

  return null;
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsStandalone(isStandaloneMode);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" &&
        window.navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    }
  };

  if (isStandalone) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-stamp-indigo/10 border border-stamp-indigo/20 text-stamp-indigo text-xs font-mono">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Installed as Standalone App</span>
      </div>
    );
  }

  if (deferredPrompt) {
    return (
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex items-center gap-2 px-4 py-2 bg-stamp-indigo hover:bg-stamp-indigo-hover text-white rounded-[4px] text-xs font-mono font-medium transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <div className="text-xs font-mono text-muted-text flex items-center gap-1.5">
        <Share className="w-3.5 h-3.5 text-stamp-indigo" />
        <span>To install on iOS: Tap Share → &apos;Add to Home Screen&apos;</span>
      </div>
    );
  }

  return (
    <div className="text-xs font-mono text-muted-text">
      App is ready for offline caching and standalone execution.
    </div>
  );
}

