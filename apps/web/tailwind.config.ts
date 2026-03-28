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
      boxShadow: {
        // Premium warm shadows with depth
        "card": "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
        "card-hover": "0 8px 30px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)",
        "elevated": "0 12px 40px rgba(0, 0, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)",
        "glow-accent": "0 0 20px rgba(196, 93, 62, 0.15), 0 0 8px rgba(196, 93, 62, 0.08)",
        "glow-gold": "0 0 20px rgba(201, 168, 76, 0.12), 0 0 8px rgba(201, 168, 76, 0.06)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
        "toast": "0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-in-up": "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in-down": "fadeInDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right": "slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in-bounce": "scaleInBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        shimmer: "shimmer 2s ease-in-out infinite",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        "spin-slow": "spin 3s linear infinite",
        "float": "float 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
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
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        scaleInBounce: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "60%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(196, 93, 62, 0)" },
          "50%": { boxShadow: "0 0 20px rgba(196, 93, 62, 0.1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      transitionTimingFunction: {
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "smooth": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
        "400": "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
