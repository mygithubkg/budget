import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Semantic Ledger Design System Tokens
        "paper-bg": "var(--paper-bg)",
        "ink-text": "var(--ink-text)",
        "rule-red": "var(--rule-red)",
        "passbook-gold": "var(--passbook-gold)",
        "stamp-indigo": "var(--stamp-indigo)",
        "fiber-line": "var(--fiber-line)",
        "card-bg": "var(--card-bg)",
        "muted-text": "var(--muted-text)",

        // UI aliases
        background: "var(--paper-bg)",
        foreground: "var(--ink-text)",
        card: {
          DEFAULT: "var(--card-bg)",
          foreground: "var(--ink-text)",
        },
        popover: {
          DEFAULT: "var(--card-bg)",
          foreground: "var(--ink-text)",
        },
        primary: {
          DEFAULT: "var(--stamp-indigo)",
          foreground: "#EDE7D6",
        },
        secondary: {
          DEFAULT: "var(--fiber-line)",
          foreground: "var(--ink-text)",
        },
        muted: {
          DEFAULT: "var(--card-bg)",
          foreground: "var(--muted-text)",
        },
        accent: {
          DEFAULT: "var(--fiber-line)",
          foreground: "var(--ink-text)",
        },
        destructive: {
          DEFAULT: "var(--rule-red)",
          foreground: "#EDE7D6",
        },
        border: "var(--fiber-line)",
        input: "var(--fiber-line)",
        ring: "var(--stamp-indigo)",

        // 8-hue Categorical Palette (Muted Archival Inks)
        category: {
          food: "#A23B2E",
          groceries: "#6B8F5E",
          travel: "#2F3F6B",
          rent: "#7A5232",
          utilities: "#5B6670",
          entertainment: "#6B4C6B",
          shopping: "#C08A2E",
          health: "#3F7368",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-ibm-plex-sans)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
        "mono-amount": ["var(--font-ibm-plex-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "10px",
        "2xl": "12px",
      },
      keyframes: {
        "stamp-in": {
          "0%": { transform: "scale(1.18) rotate(var(--stamp-deg, -4deg))", opacity: "0" },
          "70%": { transform: "scale(0.96) rotate(var(--stamp-deg, -4deg))", opacity: "1" },
          "100%": { transform: "scale(1.0) rotate(var(--stamp-deg, -4deg))", opacity: "1" },
        },
        "mic-pulse": {
          "0%": { transform: "scale(1.0)", opacity: "0.75" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
      },
      animation: {
        stamp: "stamp-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "mic-pulse": "mic-pulse 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
