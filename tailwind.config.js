import {heroui} from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "sans-serif"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        // 🌿 Koala Pastel Light
        koala: {
          mint: "#A8E6CF",
          blush: "#FFD3B6",
          sun: "#FFF5BA",
          sky: "#A0D8F1",
          leaf: "#BEEBC4",
          honey: "#FEEBCB",
          red: "#FFB5B5",
          mist: "#F7F7F7",
          grey: "#374151",
          cloud: "#E5E7EB",

          // 🌙 Koala Pastel Dark
          dark: {
            bg: "#1E293B",
            surface: "#334155",
            primary: "#7DD3FC",
            accent: "#F9A8D4",
            text: "#F8FAFC",
            subtext: "#94A3B8",
            border: "#475569",
          },
        },
        },
        boxShadow: {
          "koala-soft": "0 2px 8px rgba(55, 65, 81, 0.08)",
          "koala-hover": "0 4px 12px rgba(55, 65, 81, 0.12)",
        },
        borderRadius: {
          "2xl": "1rem",
          "3xl": "1.5rem",
        },
    },
  },
  darkMode: "class",
  plugins: [heroui({
      themes: {
        light: {
          colors: {
            // 🌿 Koala Pastel Light
            background: "#F7F7F7",
            foreground: "#374151",
            primary: "#A8E6CF",
            secondary: "#FFD3B6",
            success: "#BEEBC4",
            warning: "#FEEBCB",
            danger: "#FFB5B5",
            info: "#A0D8F1",
            accent: "#FFF5BA",
            neutral: "#E5E7EB",
            divider: "#E5E7EB",
          },
          layout: {
            radius: {
              small: "0.5rem",
              medium: "1rem",
              large: "1.5rem",
            },
            boxShadow: {
              soft: "0 2px 8px rgba(55,65,81,0.08)",
              hover: "0 4px 12px rgba(55,65,81,0.12)",
            },
          },
        },
        dark: {
          colors: {
            // 🌙 Keep HeroUI default but tweak slightly for Koala Dark
            // background: "#0F172A",
            foreground: "#F8FAFC",
            primary: "#7DD3FC",
            secondary: "#F9A8D4",
            success: "#86EFAC",
            warning: "#FACC15",
            danger: "#F87171",
            info: "#38BDF8",
            divider: "#334155",
          }
        },
        // 🐨 Optional Custom: “Koala Night” (fusion style)
        koala: {
          colors: {
            background: "#F7F7F7",
            foreground: "#374151",
            primary: "#A8E6CF",
            secondary: "#FFD3B6",
            accent: "#A0D8F1",
            card: "#FFFFFF",
            border: "#E5E7EB",
          },
        },
      },
    })],
}

module.exports = config;