"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { initials } from "@/components/Logo";

export type LbRow = { name: string; title: string; primary: number; primaryLabel: string; wins: number; secondary: string };

const MEDAL = ["🥇", "🥈", "🥉"];

function fmt(n: number, label: string) {
  return label === "won" ? "$" + n.toLocaleString("en-US") : n.toLocaleString("en-US");
}

function Board({ title, rows, accent }: { title: string; rows: LbRow[]; accent: string }) {
  const max = Math.max(1, ...rows.map((r) => r.primary));
  const podium = rows.slice(0, 3);
  const order = [1, 0, 2]; // 2nd, 1st, 3rd for podium layout
  return (
    <section className="lb-board">
      <div className="lb-h">
        <span className="eyebrow">{title}</span>
        <h2 className="font-display">{title === "Account Executives" ? "AE ARENA" : "BDR ARENA"}</h2>
      </div>

      <div className="lb-podium">
        {order.map((idx) => {
          const r = podium[idx];
          if (!r) return <div key={idx} />;
          const place = idx; // 0,1,2
          return (
            <motion.div
              key={r.name}
              className={`lb-pod lb-pod-${place}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + place * 0.08, type: "spring", stiffness: 220, damping: 18 }}
            >
              <div className="lb-medal">{MEDAL[place]}</div>
              <div className={`lb-pod-av${place === 0 ? " lead" : ""}`} style={{ borderColor: accent }}>{initials(r.name)}</div>
              <div className="lb-pod-nm">{r.name}</div>
              <div className="lb-pod-val font-display" style={{ color: accent }}>{fmt(r.primary, r.primaryLabel)}</div>
              <div className="lb-pod-sub">{r.secondary}</div>
              <motion.div className="lb-pod-bar" initial={{ height: 0 }} animate={{ height: place === 0 ? 90 : place === 1 ? 64 : 44 }} transition={{ delay: 0.2 + place * 0.1, duration: 0.5 }} style={{ background: accent }}>
                <span>{place + 1}</span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      <div className="lb-rows">
        {rows.map((r, i) => (
          <motion.div className={`lb-row${i === 0 ? " leader" : ""}`} key={r.name}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            <span className="lb-rank">{i < 3 ? MEDAL[i] : i + 1}</span>
            <span className="lb-av">{initials(r.name)}</span>
            <div className="lb-info">
              <div className="lb-nm">{r.name}<small>{r.title}</small></div>
              <div className="lb-track"><motion.i initial={{ width: 0 }} animate={{ width: `${(r.primary / max) * 100}%` }} transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1], delay: 0.1 + i * 0.05 }} style={{ background: accent }} /></div>
            </div>
            <div className="lb-metric">
              <span className="lb-metric-v font-display" style={{ color: accent }}>{fmt(r.primary, r.primaryLabel)}</span>
              <span className="lb-metric-l">{r.secondary}</span>
            </div>
          </motion.div>
        ))}
        {rows.length === 0 && <div className="q-note" style={{ padding: 16 }}>No reps yet.</div>}
      </div>
    </section>
  );
}

export default function LeaderboardView({ aeRows, bdrRows }: { aeRows: LbRow[]; bdrRows: LbRow[] }) {
  const [tab, setTab] = useState<"ae" | "bdr">("ae");
  return (
    <div className="lb">
      <div className="lb-tabs">
        <button className={`lb-tab${tab === "ae" ? " on" : ""}`} onClick={() => setTab("ae")}>Account Executives</button>
        <button className={`lb-tab${tab === "bdr" ? " on" : ""}`} onClick={() => setTab("bdr")}>BDRs</button>
      </div>
      {tab === "ae"
        ? <Board title="Account Executives" rows={aeRows} accent="var(--neon)" />
        : <Board title="BDRs" rows={bdrRows} accent="var(--violet-br)" />}
    </div>
  );
}
