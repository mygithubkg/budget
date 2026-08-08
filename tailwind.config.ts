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
        // ── Global Material Design 3 Design System Tokens ──
        surface: "var(--md-surface)",
        "surface-dim": "var(--md-surface-dim)",
        "surface-container-lowest": "var(--md-surface-container-lowest)",
        "surface-container-low": "var(--md-surface-container-low)",
        "surface-container": "var(--md-surface-container)",
        "surface-container-high": "var(--md-surface-container-high)",
        "surface-container-highest": "var(--md-surface-container-highest)",
        "surface-variant": "var(--md-surface-variant)",
        "surface-bright": "var(--md-surface-bright)",
        outline: "var(--md-outline)",
        "outline-variant": "var(--md-outline-variant)",
        "on-surface": "var(--md-on-surface)",
        "on-surface-variant": "var(--md-on-surface-variant)",

        primary: {
          DEFAULT: "var(--md-primary)",
          container: "var(--md-primary-container)",
          inverse: "var(--md-inverse-primary)",
          foreground: "var(--md-on-primary)",
        },
        "on-primary": "var(--md-on-primary)",
        "primary-container": "var(--md-primary-container)",
        "on-primary-container": "var(--md-on-primary-container)",
        "inverse-primary": "var(--md-inverse-primary)",

        secondary: {
          DEFAULT: "var(--md-secondary)",
          container: "var(--md-secondary-container)",
          foreground: "var(--md-on-secondary)",
        },
        "on-secondary": "var(--md-on-secondary)",
        "secondary-container": "var(--md-secondary-container)",
        "on-secondary-container": "var(--md-on-secondary-container)",

        tertiary: {
          DEFAULT: "var(--md-tertiary)",
          container: "var(--md-tertiary-container)",
        },
        "on-tertiary": "var(--md-on-tertiary)",
        "tertiary-container": "var(--md-tertiary-container)",
        "on-tertiary-container": "var(--md-on-tertiary-container)",
        "on-tertiary-fixed": "var(--md-on-tertiary-fixed)",

        error: {
          DEFAULT: "var(--md-error)",
          container: "var(--md-error-container)",
        },
        "on-error": "var(--md-on-error)",
        "error-container": "var(--md-error-container)",
        "on-error-container": "var(--md-on-error-container)",

        // ── Ledger v2 Design System Tokens ──
        "paper-bg":    "var(--paper-bg)",
        "card-bg":     "var(--card-bg)",
        "ink-text":    "var(--ink-text)",
        "muted-text":  "var(--muted-text)",
        "stamp-red":   "var(--stamp-red)",
        "thrive-green":"var(--thrive-green)",
        "fiber-line":  "var(--fiber-line)",

        // ── Mobile UI v3 Tokens (<640px) ──
        mobile: {
          page:          "var(--mobile-bg-page)",
          card:          "var(--mobile-bg-card)",
          "card-elevated":"var(--mobile-bg-card-elevated)",
          primary:       "var(--mobile-text-primary)",
          secondary:     "var(--mobile-text-secondary)",
          muted:         "var(--mobile-text-muted)",
          green:         "var(--mobile-positive-green)",
          red:           "var(--mobile-negative-red)",
          border:        "var(--mobile-border)",
        },

        // ── MD Namespaced Aliases (Backwards Compatibility) ──
        md: {
          surface: "var(--md-surface)",
          "surface-dim": "var(--md-surface-dim)",
          "surface-container-lowest": "var(--md-surface-container-lowest)",
          "surface-container-low": "var(--md-surface-container-low)",
          "surface-container": "var(--md-surface-container)",
          "surface-container-high": "var(--md-surface-container-high)",
          "surface-container-highest": "var(--md-surface-container-highest)",
          "surface-variant": "var(--md-surface-variant)",
          "surface-bright": "var(--md-surface-bright)",
          outline: "var(--md-outline)",
          "outline-variant": "var(--md-outline-variant)",
          "on-surface": "var(--md-on-surface)",
          "on-surface-variant": "var(--md-on-surface-variant)",

          primary: "var(--md-primary)",
          "on-primary": "var(--md-on-primary)",
          "primary-container": "var(--md-primary-container)",
          "on-primary-container": "var(--md-on-primary-container)",
          "inverse-primary": "var(--md-inverse-primary)",

          secondary: "var(--md-secondary)",
          "on-secondary": "var(--md-on-secondary)",
          "secondary-container": "var(--md-secondary-container)",
          "on-secondary-container": "var(--md-on-secondary-container)",

          tertiary: "var(--md-tertiary)",
          "on-tertiary": "var(--md-on-tertiary)",
          "tertiary-container": "var(--md-tertiary-container)",
          "on-tertiary-container": "var(--md-on-tertiary-container)",
          "on-tertiary-fixed": "var(--md-on-tertiary-fixed)",

          error: "var(--md-error)",
          "on-error": "var(--md-on-error)",
          "error-container": "var(--md-error-container)",
          "on-error-container": "var(--md-on-error-container)",
        },

        // Legacy aliases kept for gradual migration
        "rule-red":       "var(--stamp-red)",
        "passbook-gold":  "var(--thrive-green)",
        "stamp-indigo":   "var(--stamp-red)",

        // ── Radix / shadcn UI aliases ──
        background: "var(--paper-bg)",
        foreground: "var(--ink-text)",
        card: {
          DEFAULT:    "var(--card-bg)",
          foreground: "var(--ink-text)",
        },
        popover: {
          DEFAULT:    "var(--card-bg)",
          foreground: "var(--ink-text)",
        },
        muted: {
          DEFAULT:    "var(--card-bg)",
          foreground: "var(--muted-text)",
        },
        accent: {
          DEFAULT:    "var(--fiber-line)",
          foreground: "var(--ink-text)",
        },
        destructive: {
          DEFAULT:    "var(--stamp-red)",
          foreground: "#FFFFFF",
        },
        border: "var(--fiber-line)",
        input:  "var(--fiber-line)",
        ring:   "var(--stamp-red)",

        // ── 8-hue Categorical Palette v2 (vivid, saturated) ──
        category: {
          food:          "#E63946",  // stamp-red
          groceries:     "#16A874",  // thrive-green
          travel:        "#3A6FF7",  // vivid indigo-blue
          rent:          "#D97B3F",  // warm amber-brown
          utilities:     "#6B7684",  // slate
          entertainment: "#9B4F96",  // vivid plum
          shopping:      "#F2A93B",  // vivid ochre
          health:        "#1E9E8C",  // vivid teal
        },
      },

      fontFamily: {
        display:       ["var(--font-fraunces)", "serif"],
        sans:          ["var(--font-ibm-plex-sans)", "sans-serif"],
        inter:         ["var(--font-inter)", "sans-serif"],
        mono:          ["var(--font-jetbrains-mono)", "var(--font-ibm-plex-mono)", "monospace"],
        "mono-amount": ["var(--font-jetbrains-mono)", "var(--font-ibm-plex-mono)", "monospace"],
        "jetbrains-mono": ["var(--font-jetbrains-mono)", "monospace"],
      },

      borderRadius: {
        DEFAULT: "12px",
        sm:  "4px",
        md:  "6px",
        lg:  "8px",
        xl:  "12px",
        "2xl": "16px",
      },

      boxShadow: {
        // Layered card shadows (light mode)
        card:  "0 2px 8px rgba(23, 25, 35, 0.06), 0 8px 24px rgba(23, 25, 35, 0.08)",
        // Ink-stamp tactile shadow
        stamp: "0 3px 6px rgba(230, 57, 70, 0.25)",
        "stamp-dark": "0 3px 6px rgba(255, 107, 107, 0.30)",
        xs:    "0 1px 3px rgba(23, 25, 35, 0.08)",
      },

      keyframes: {
        "stamp-in": {
          "0%":   { transform: "scale(1.18) rotate(var(--stamp-deg, -4deg))", opacity: "0" },
          "70%":  { transform: "scale(0.96) rotate(var(--stamp-deg, -4deg))", opacity: "1" },
          "100%": { transform: "scale(1.0)  rotate(var(--stamp-deg, -4deg))", opacity: "1" },
        },
        "mic-pulse": {
          "0%":   { transform: "scale(1.0)",  opacity: "0.75" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        stamp:      "stamp-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "mic-pulse":"mic-pulse 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
        "fade-up":  "fade-up 0.3s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
