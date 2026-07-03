import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F5898", // The Alumni Center primary — see brand/alumni-center-logo.png
          dark: "#0B3F6E",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
