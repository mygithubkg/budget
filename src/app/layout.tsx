import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ThemeColorManager } from "@/components/pwa/ThemeColorManager";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { Toaster } from "sonner";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=IBM+Plex+Mono:ital,wght@0,400..700;1,400..700&family=IBM+Plex+Sans:ital,wght@0,300..700;1,300..700&family=Inter:wght@300..800&family=JetBrains+Mono:wght@400..800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function isExtensionError(msg, file) {
                var m = (msg || '').toString();
                var f = (file || '').toString();
                return f.includes('extension') ||
                  f.includes('keyboard-shortcuts') ||
                  f.includes('chrome-extension') ||
                  f.includes('moz-extension') ||
                  m.includes('Injection error') ||
                  m.includes('Crypto site') ||
                  m.includes('SecurityError') ||
                  m.includes('cross-origin frame') ||
                  m.includes("reading 'location'");
              }
              window.addEventListener('error', function(e) {
                if (isExtensionError(e.message, e.filename)) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              }, true);
              window.addEventListener('unhandledrejection', function(e) {
                var reason = e.reason ? (e.reason.message || e.reason.toString()) : '';
                if (isExtensionError(reason, '')) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              }, true);
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-paper-bg text-ink-text font-sans antialiased selection:bg-stamp-red/20 selection:text-stamp-red">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AmbientBackground />
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
