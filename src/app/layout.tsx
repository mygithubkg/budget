import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ThemeColorManager } from "@/components/pwa/ThemeColorManager";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Toaster } from "sonner";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinChat — Ledger Account Register & Expense Tracker",
  description:
    "Log expenses line by line with natural language AI. Ruled accounts, smart category deduplication, friend debt tracking, and real-time ledger analytics.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FinChat",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-paper-bg text-ink-text font-sans antialiased selection:bg-stamp-indigo/20 selection:text-stamp-indigo">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeColorManager />
          <QueryProvider>
            <AuthProvider>
              {children}
              <InstallPrompt />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: "var(--card-bg)",
                    color: "var(--ink-text)",
                    border: "1px solid var(--fiber-line)",
                    fontFamily: "var(--font-ibm-plex-sans)",
                    borderRadius: "8px",
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
