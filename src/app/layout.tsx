import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";

// Display — sharp, characterful, expensive (Clash Display energy, self-hosted)
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"], display: "swap" });
// Body / UI — clean neutral grotesque (Satoshi energy)
const sans = Hanken_Grotesk({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Layers Weave",
  description: "Layers Weave — sales CRM for second-hand wholesale",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Apply persisted theme/density before first paint to avoid a flash.
  const themeScript = `(function(){try{var p=JSON.parse(localStorage.getItem('lw-prefs')||'{}');var e=document.documentElement;e.setAttribute('data-theme',p.theme==='light'?'light':'dark');if(p.compact)e.classList.add('compact');if(p.grain===false)e.classList.add('no-grain');if(p.reduceMotion)e.classList.add('reduce-motion');}catch(_){}})();`;
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
