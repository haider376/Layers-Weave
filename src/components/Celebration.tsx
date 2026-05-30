"use client";

import { useEffect, useRef, useState } from "react";

export type CelebrationKind = "sql" | "won" | "delivered" | "quote";

// Per-team Gen-Z flavored celebrations.
const VARIANTS: Record<CelebrationKind, { title: string; sub: string; colors: string[]; emoji: string }> = {
  sql: {
    title: "SQL BOOKED 🔥",
    sub: "Sales just pulled up. Lock in.",
    colors: ["#A5EB00", "#A47BFF", "#fff"],
    emoji: "📅",
  },
  won: {
    title: "DEAL CLOSED 💸",
    sub: "Bag secured. That's W behavior.",
    colors: ["#A5EB00", "#EF9F27", "#fff", "#A47BFF"],
    emoji: "🤑",
  },
  delivered: {
    title: "DELIVERED ✅",
    sub: "Logistics ate. No crumbs left.",
    colors: ["#A47BFF", "#A5EB00", "#fff"],
    emoji: "📦",
  },
  quote: {
    title: "QUOTE LIVE ⚡",
    sub: "Supply's cooking. Say less.",
    colors: ["#EF9F27", "#A5EB00", "#fff"],
    emoji: "🧾",
  },
};

export function celebrate(kind: CelebrationKind) {
  window.dispatchEvent(new CustomEvent("lw-celebrate", { detail: kind }));
}

export default function Celebration() {
  const [active, setActive] = useState<CelebrationKind | null>(null);
  const [pieces, setPieces] = useState<{ id: number; left: number; delay: number; color: string; rot: number }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function onCelebrate(e: Event) {
      const kind = (e as CustomEvent<CelebrationKind>).detail;
      const v = VARIANTS[kind];
      const next = Array.from({ length: 90 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        color: v.colors[i % v.colors.length],
        rot: Math.random() * 360,
      }));
      setPieces(next);
      setActive(kind);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setActive(null), 2600);
    }
    window.addEventListener("lw-celebrate", onCelebrate);
    return () => {
      window.removeEventListener("lw-celebrate", onCelebrate);
      clearTimeout(timer.current);
    };
  }, []);

  if (!active) return null;
  const v = VARIANTS[active];

  return (
    <div className="celebrate" aria-live="polite">
      <div className="confetti">
        {pieces.map((p) => (
          <span
            key={p.id}
            style={{
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              transform: `rotate(${p.rot}deg)`,
            }}
          />
        ))}
      </div>
      <div className="celebrate-card">
        <div className="ce-emoji">{v.emoji}</div>
        <div className="ce-title">{v.title}</div>
        <div className="ce-sub">{v.sub}</div>
      </div>
    </div>
  );
}
