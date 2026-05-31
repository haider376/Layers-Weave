"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type FDeal = { id: string; name: string; company: string; owner: string; stage: string; amount: number; prob: number; weighted: number };

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// Commit categories a rep slots each open deal into (sales-forecast ritual).
const CATS = [
  { key: "commit", label: "Commit", desc: "Will close this period", color: "var(--neon)" },
  { key: "best", label: "Best case", desc: "Upside if things go well", color: "var(--violet-br)" },
  { key: "pipeline", label: "Pipeline", desc: "Too early to call", color: "var(--muted)" },
];

// Default categorisation from probability; user can re-slot locally.
const defaultCat = (prob: number) => (prob >= 40 ? "commit" : prob >= 20 ? "best" : "pipeline");

export default function ForecastBoard({ deals }: { deals: FDeal[] }) {
  const [cat, setCat] = useState<Record<string, string>>(() => Object.fromEntries(deals.map((d) => [d.id, defaultCat(d.prob)])));
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<string, FDeal[]> = { commit: [], best: [], pipeline: [] };
    for (const d of deals) (g[cat[d.id] ?? "pipeline"] ??= []).push(d);
    return g;
  }, [deals, cat]);

  const total = (k: string) => (grouped[k] ?? []).reduce((s, d) => s + d.amount, 0);

  function drop(k: string) {
    if (dragId) setCat((c) => ({ ...c, [dragId]: k }));
    setDragId(null); setOver(null);
  }

  return (
    <section className="panel" style={{ overflow: "visible" }}>
      <div className="panel-h"><h2>Commit board</h2><span className="count">drag deals between columns</span></div>
      <div className="fcast-board">
        {CATS.map((c) => (
          <div
            key={c.key}
            className={`fcast-col${over === c.key ? " over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); if (over !== c.key) setOver(c.key); }}
            onDrop={() => drop(c.key)}
          >
            <div className="fcast-col-h">
              <span className="fcast-dot" style={{ background: c.color }} />
              <b>{c.label}</b>
              <span className="fcast-col-v">{money(total(c.key))}</span>
            </div>
            <div className="fcast-col-d">{c.desc}</div>
            <div className="fcast-col-b">
              {(grouped[c.key] ?? []).map((d) => (
                <div
                  key={d.id}
                  className={`fcast-card${dragId === d.id ? " dragging" : ""}`}
                  draggable
                  onDragStart={() => setDragId(d.id)}
                  onDragEnd={() => { setDragId(null); setOver(null); }}
                >
                  <Link href={`?deal=${d.id}`} scroll={false} className="fcast-card-t">{d.name}</Link>
                  <div className="fcast-card-m">
                    <span>{d.company}</span>
                    <span className="fcast-amt">{money(d.amount)}</span>
                  </div>
                  <div className="fcast-card-f">
                    <span className="fcast-owner">{d.owner.split(" ")[0]}</span>
                    <span className="fcast-prob">{d.prob}%</span>
                  </div>
                </div>
              ))}
              {(grouped[c.key] ?? []).length === 0 && <div className="q-note" style={{ padding: 18, fontSize: 11 }}>Drop deals here</div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
