import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Editorial warm dark palette
        ink: {
          DEFAULT: "#0a0a0c",
          50: "#111113",
          100: "#161618",
          200: "#1c1c1f",
          300: "#242427",
          400: "#2e2e32",
          500: "#3a3a3f",
          600: "#4a4a50",
          700: "#62626a",
          800: "#8a8a94",
          900: "#b0b0b8",
        },
        // Warm paper tones for text
        paper: {
          DEFAULT: "#e8e4de",
          muted: "#a09a90",
          dim: "#6b6660",
          faint: "#4a4642",
        },
        // Terracotta / rust accent
        accent: {
          DEFAULT: "#c45d3e",
          hover: "#d4714f",
          subtle: "rgba(196, 93, 62, 0.08)",
          muted: "rgba(196, 93, 62, 0.15)",
        },
        // Gold for AI elements
        gold: {
          DEFAULT: "#c9a84c",
          hover: "#d4b85e",
          subtle: "rgba(201, 168, 76, 0.08)",
          muted: "rgba(201, 168, 76, 0.15)",
        },
        // Semantic colors
        success: {
          DEFAULT: "#5a9e6f",
          subtle: "rgba(90, 158, 111, 0.1)",
        },
        danger: {
          DEFAULT: "#c44e4e",
          hover: "#d45e5e",
          subtle: "rgba(196, 78, 78, 0.1)",
        },
      },
      fontFamily: {
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["'DM Mono', 'Fira Code', 'Consolas', monospace"],
      },
      fontSize: {
        // Editorial type scale
        "display-lg": ["2.75rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display": ["2rem", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        "display-sm": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "heading": ["1.125rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "label": ["0.6875rem", { lineHeight: "1", letterSpacing: "0.08em" }],
        "caption": ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.01em" }],
        "micro": ["0.625rem", { lineHeight: "1.2", letterSpacing: "0.06em" }],
      },
      spacing: {
        "4.5": "1.125rem",
      },
      letterSpacing: {
        editorial: "0.08em",
        tight: "-0.015em",
      },
      borderWidth: {
        hairline: "0.5px",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right": "slideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2.5s ease-in-out infinite",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideRight: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
