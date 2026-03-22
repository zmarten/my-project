import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0f0d",
          card: "#111916",
          hover: "#162016",
        },
        accent: {
          green: "#4ade80",
          teal: "#2dd4bf",
          amber: "#f59e0b",
          red: "#ef4444",
          blue: "#60a5fa",
        },
        border: {
          DEFAULT: "#1e2e24",
          hover: "#2a3f30",
        },
        text: {
          primary: "#e2e8e4",
          secondary: "#8b9e8f",
          muted: "#5a6e5e",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        display: ["var(--font-fraunces)", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
