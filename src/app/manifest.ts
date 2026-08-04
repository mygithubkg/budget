import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinChat — AI Expense Tracker",
    short_name: "FinChat",
    description:
      "Log expenses and income by chatting — split costs with friends and track your balance.",
    start_url: "/chat",
    display: "standalone",
    orientation: "portrait",
    background_color: "#EDF1E6", // paper-bg from the Ledger design system
    theme_color: "#12201A", // ink-bg — sets the OS/browser chrome color on launch
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
