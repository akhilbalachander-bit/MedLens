import type { Config } from "tailwindcss";

/**
 * MedLens dark theme. Components use a small set of semantic colours
 * (ink, slate, brand, amber/red/emerald/sky); here they are re-pointed for a
 * deep-navy background: low shades are dark tinted surfaces and borders, high
 * shades are light text, and the solid 500–600 fills keep white text readable.
 * Teal comes from the MedLens logo.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#0b2530",
          100: "#0f3140",
          200: "#1a4a5a",
          300: "#23697a",
          400: "#2fc6d0",
          500: "#22d3dc",
          600: "#14aab6",
          700: "#0d8a96",
          800: "#7fe0e6",
          900: "#c3f4f6",
        },
        ink: {
          DEFAULT: "#edf4fa",
          soft: "#b8c7d8",
          muted: "#8da1b8",
        },
        navy: {
          950: "#040a14",
          900: "#071224",
          800: "#0b1728",
          700: "#11223a",
        },
        slate: {
          50: "#0e1c30",
          100: "#13243b",
          200: "#1c3150",
          300: "#284268",
          400: "#6c84a3",
          700: "#c5d3e4",
          800: "#dbe5f0",
        },
        amber: {
          50: "#2a1d06",
          100: "#3a2908",
          300: "#8b6414",
          400: "#f5b62e",
          600: "#f2b13a",
          700: "#f4bc4c",
          800: "#f7cf7f",
          900: "#f9dc9b",
          950: "#fde8bf",
        },
        red: {
          50: "#2c0e13",
          100: "#3e141c",
          300: "#8d2b38",
          700: "#f87171",
          800: "#fca5a5",
          900: "#fecaca",
        },
        emerald: {
          50: "#0a2a21",
          100: "#0e3a2d",
          200: "#1b5a46",
          300: "#27775e",
          800: "#8fe3c2",
          900: "#b8f0d9",
        },
        sky: {
          50: "#0b2135",
          100: "#0f2c46",
          200: "#1b4466",
          800: "#a5d8ff",
          900: "#cfe8ff",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.45), 0 10px 30px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
