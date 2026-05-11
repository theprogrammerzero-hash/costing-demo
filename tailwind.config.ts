import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#000000",
          muted: "#666666",
          subtle: "#999999",
        },
        line: {
          DEFAULT: "#E5E5E5",
          strong: "#CCCCCC",
        },
        paper: "#FFFFFF",
        accent: {
          neg: "#C00000",
          pos: "#0A6640",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        xxs: ["0.6875rem", { lineHeight: "1rem" }],
      },
      spacing: {
        sidebar: "220px",
        header: "52px",
      },
    },
  },
  plugins: [],
};
export default config;
