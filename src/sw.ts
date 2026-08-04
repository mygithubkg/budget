/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Filter defaultCache to ensure /api/ (especially POST routes like /api/chat) are NEVER intercepted or cached
const safeRuntimeCaching = defaultCache.filter((entry) => {
  if (typeof entry.matcher === "function") {
    // Keep custom function matchers that don't match /api/
    return true;
  }
  if (entry.matcher instanceof RegExp) {
    // Exclude any matcher that might capture /api/
    return !entry.matcher.test("/api/chat");
  }
  return true;
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: safeRuntimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
