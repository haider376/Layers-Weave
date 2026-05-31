import type { Config } from "tailwindcss";

// Tailwind utilities map to the live CSS variables in globals.css, so brand
// tokens (mono + lime) stay in one source of truth. Use e.g. bg-panel,
// text-ink, border-line, text-accent, font-display.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        raise: "var(--raise)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        ink: "var(--text)",
        text: "var(--text)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        accent: "var(--neon)",
        neon: "var(--neon)",
        "accent-ink": "var(--neon-ink)",
        amber: "var(--amber)",
        red: "var(--red)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        r: "var(--r)",
      },
      boxShadow: {
        glow: "var(--glow-green)",
      },
    },
  },
  plugins: [],
};

export default config;
