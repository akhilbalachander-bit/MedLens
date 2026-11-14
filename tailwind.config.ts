import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf8",
          100: "#d1faec",
          200: "#a7f3da",
          300: "#6ee7c2",
          400: "#34d3a6",
          500: "#10b98c",
          600: "#059673",
          700: "#047860",
          800: "#065f4d",
          900: "#064e41",
        },
        ink: {
          DEFAULT: "#0f1f2e",
          soft: "#3b4b5c",
          muted: "#64748b",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,31,46,0.06), 0 4px 16px rgba(15,31,46,0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
