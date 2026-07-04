import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F5898",
          dark: "#0B3F6E",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
