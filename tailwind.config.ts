import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#071014",
        panel: "#0B1920",
        "panel-2": "#0F2129",
        raise: "#13303C",
        neon: "#A5EB00",
        "neon-ink": "#0c2400",
        violet: "#6D19FF",
        "violet-br": "#A47BFF",
        amber: "#EF9F27",
        red: "#E24B4A",
        text: "#EAF1F4",
        muted: "#7E909A",
        faint: "#566872",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        display: ["'PP Monument Extended'", "Montserrat", "sans-serif"],
      },
      borderRadius: {
        r: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
