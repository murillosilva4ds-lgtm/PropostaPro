import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff0f5",
          100: "#ffd8e6",
          200: "#ffb0cb",
          300: "#ff83ae",
          400: "#ff5892",
          500: "#f52f78",
          600: "#df205f",
          700: "#bc194f",
          800: "#941842",
          900: "#701737"
        },
        gray: {
          50: "#0a090d",
          100: "#121117",
          200: "#24212a",
          300: "#393540",
          400: "#77717f",
          500: "#a19aa8",
          600: "#c1bac7",
          700: "#d8d2dc",
          800: "#eee8f1",
          900: "#fbf7fc"
        }
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(16,24,40,0.05), 0 1px 3px 0 rgba(16,24,40,0.06)"
      }
    }
  },
  plugins: []
};
export default config;
