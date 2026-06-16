"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Donut, { type DonutSlice } from "@/components/Donut";
import Sparkline from "@/components/Sparkline";

type Bar = { label: string; value: string; pct: number; color?: string };
type Seg = { k: string; v: number; color: string };
type Stack = { label: string; total: number; segs: Seg[] };
type Quota = { actual: string; goal: string; pct: number; deals: number };

type FunnelStep = { label: string; value: number };
type Forecast = { committed: string; weighted: string; best: string; rows: { label: string; value: string; pct: number }[] };

export type Card =
  | { id: string; title: string; hint?: string; type: "donut"; data: DonutSlice[]; center?: string }
  | { id: string; title: string; hint?: string; type: "bars"; data: Bar[] }
  | { id: string; title: string; hint?: string; type: "stacked"; data: Stack[] }
  | { id: string; title: string; hint?: string; type: "spark"; data: number[] }
  | { id: string; title: string; hint?: string; type: "quota"; data: Quota }
  | { id: string; title: string; hint?: string; type: "funnel"; data: FunnelStep[] }
  | { id: string; title: string; hint?: string; type: "forecast"; data: Forecast };

export type Kpi = { label: string; value: string; sub: string; accent?: "neon" | "vio" };

export default function AnalyticsBoard({ kpis, cards, storageKey = "analytics-order" }: { kpis: Kpi[]; cards: Card[]; storageKey?: string }) {
  const KEY = `lw-${storageKey}`;
  const [order, setOrder] = useState<string[]>(cards.map((c) => c.id));
  const [full, setFull] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (saved) {
      try {
        const ids = JSON.parse(saved) as string[];
        const valid = ids.filter((id) => cards.some((c) => c.id === id));
        const missing = cards.map((c) => c.id).filter((id) => !valid.includes(id));
        setOrder([...valid, ...missing]);
      } catch { /* ignore */ }
    }
  }, [cards, KEY]);

  function persist(next: string[]) {
    setOrder(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  // Native drag-and-drop reorder — works reliably in a grid (Framer Reorder
  // assumes a single axis and glitches across grid columns).
  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const next = [...order];
    const from = next.indexOf(dragId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, dragId);
    persist(next);
    setDragId(null);
    setOverId(null);
  }

  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const ordered = order.map((id) => byId[id]).filter(Boolean) as Card[];
  const fullCard = full ? byId[full] : null;

  return (
    <>
      <div className="kpis" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        {kpis.map((k) => (
          <motion.div key={k.label} className={`kpi${k.accent === "vio" ? " v" : ""}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <span className="bar" />
            <div className="lbl">{k.label}</div>
            <div className={`val ${k.accent ?? ""}`}>{k.value}</div>
            <div className="delta">{k.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="an-grid">
        {ordered.map((c) => (
          <div
            key={c.id}
            className={`an-card${dragId === c.id ? " dragging" : ""}${overId === c.id && dragId !== c.id ? " dropzone" : ""}`}
            draggable
            onDragStart={() => setDragId(c.id)}
            onDragEnd={() => { setDragId(null); setOverId(null); }}
            onDragOver={(e) => { e.preventDefault(); if (overId !== c.id) setOverId(c.id); }}
            onDrop={() => onDrop(c.id)}
          >
            <div className="an-h">
              <span className="an-drag" title="Drag to reorder">⠿</span>
              <h2>{c.title}</h2>
              {c.hint && <span className="count">{c.hint}</span>}
              <button className="an-expand" title="Full view" onClick={() => setFull(c.id)}>⤢</button>
            </div>
            <div className="an-body">{renderCard(c)}</div>
          </div>
        ))}
      </div>

      {fullCard && <FullView card={fullCard} onClose={() => setFull(null)} />}
    </>
  );
}

/* ───────── Full-screen single-report view with in-depth filters ───────── */
type RowLike = { label: string; value: string; pct: number; color?: string };

function FullView({ card, onClose }: { card: Card; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"value" | "az" | "orig">("value");
  const [topN, setTopN] = useState(0); // 0 = all
  const [minPct, setMinPct] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Time-series (spark) controls
  const [window, setWindow] = useState(0); // 0 = all points
  const [cumulative, setCumulative] = useState(false);

  // Cards that expose a list of rows get the rich filter rail.
  const rows: RowLike[] | null = useMemo(() => {
    if (card.type === "bars") return card.data;
    if (card.type === "forecast") return card.data.rows;
    if (card.type === "stacked") return card.data.map((s) => ({ label: s.label, value: String(s.total), pct: s.total }));
    if (card.type === "donut") return card.data.map((d) => ({ label: d.label, value: String(d.value), pct: d.value, color: d.color }));
    return null;
  }, [card]);

  const maxPct = rows ? Math.max(1, ...rows.map((r) => r.pct)) : 1;

  const view = useMemo(() => {
    if (!rows) return null;
    let r = rows.filter((x) => !hidden.has(x.label));
    if (q.trim()) { const t = q.toLowerCase(); r = r.filter((x) => x.label.toLowerCase().includes(t)); }
    if (minPct > 0) r = r.filter((x) => (x.pct / maxPct) * 100 >= minPct);
    if (sort === "value") r = [...r].sort((a, b) => b.pct - a.pct);
    else if (sort === "az") r = [...r].sort((a, b) => a.label.localeCompare(b.label));
    if (topN > 0) r = r.slice(0, topN);
    return r;
  }, [rows, q, sort, topN, minPct, hidden, maxPct]);

  return (
    <div className="an-full-wrap" onClick={onClose}>
      <div className="an-full" onClick={(e) => e.stopPropagation()}>
        <div className="an-full-h">
          <div>
            <div className="eyebrow">Full report</div>
            <h2 className="font-display">{card.title}</h2>
          </div>
          <button className="an-full-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="an-full-body">
          {rows && (
            <aside className="an-filters">
              <div className="an-filters-h">Filters</div>
              <label className="an-f"><span>Search</span><input className="ui-input" placeholder="Filter rows…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
              <label className="an-f"><span>Sort</span>
                <div className="seg an-seg">
                  {([["value", "Top"], ["az", "A–Z"], ["orig", "Default"]] as const).map(([k, l]) => (
                    <button key={k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>{l}</button>
                  ))}
                </div>
              </label>
              <label className="an-f"><span>Show top {topN === 0 ? "all" : topN}</span>
                <input type="range" min={0} max={rows.length} value={topN} onChange={(e) => setTopN(+e.target.value)} />
              </label>
              <label className="an-f"><span>Min share {minPct}%</span>
                <input type="range" min={0} max={100} step={5} value={minPct} onChange={(e) => setMinPct(+e.target.value)} />
              </label>
              <div className="an-f">
                <span>Series ({rows.length - hidden.size}/{rows.length})</span>
                <div className="an-series">
                  {rows.map((r) => (
                    <button key={r.label} className={`an-series-i${hidden.has(r.label) ? " off" : ""}`} onClick={() => setHidden((s) => { const n = new Set(s); if (n.has(r.label)) n.delete(r.label); else n.add(r.label); return n; })}>
                      <i style={{ background: r.color ?? "var(--neon)" }} />{r.label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn ghost" style={{ marginTop: 4 }} onClick={() => { setQ(""); setSort("value"); setTopN(0); setMinPct(0); setHidden(new Set()); }}>Reset filters</button>
            </aside>
          )}

          {card.type === "spark" && (
            <aside className="an-filters">
              <div className="an-filters-h">Filters</div>
              <label className="an-f"><span>Window {window === 0 ? "all" : `last ${window}`}</span>
                <input type="range" min={0} max={card.data.length} value={window} onChange={(e) => setWindow(+e.target.value)} />
              </label>
              <label className="an-f"><span>Mode</span>
                <div className="seg an-seg">
                  <button className={!cumulative ? "on" : ""} onClick={() => setCumulative(false)}>Per period</button>
                  <button className={cumulative ? "on" : ""} onClick={() => setCumulative(true)}>Cumulative</button>
                </div>
              </label>
              <button className="btn ghost" style={{ marginTop: 4 }} onClick={() => { setWindow(0); setCumulative(false); }}>Reset filters</button>
            </aside>
          )}

          <div className="an-full-chart">
            {card.type === "spark" ? (() => {
              let series = window > 0 ? card.data.slice(-window) : card.data;
              if (cumulative) { let a = 0; series = series.map((v) => (a += v)); }
              const mx = Math.max(1, ...series), mn = Math.min(...series);
              const avg = series.length ? Math.round(series.reduce((s, v) => s + v, 0) / series.length) : 0;
              return (
                <div style={{ width: "100%" }}>
                  <Sparkline data={series} height={240} />
                  <div className="an-spark-stats">
                    <div><span>Peak</span><b>{mx.toLocaleString("en-US")}</b></div>
                    <div><span>Low</span><b>{mn.toLocaleString("en-US")}</b></div>
                    <div><span>Average</span><b>{avg.toLocaleString("en-US")}</b></div>
                    <div><span>Total</span><b>{card.data.reduce((s, v) => s + v, 0).toLocaleString("en-US")}</b></div>
                  </div>
                </div>
              );
            })() : card.type === "donut" && view ? (
              <div className="an-full-donut">
                <Donut data={card.data.filter((d) => view.some((v) => v.label === d.label))} centerLabel={card.center} size={240} />
                <div className="an-legend">
                  {view.map((r) => (
                    <div className="an-legend-i" key={r.label}><i style={{ background: r.color ?? "var(--neon)" }} /><span className="an-legend-l">{r.label}</span><span className="an-legend-v">{r.value}</span></div>
                  ))}
                </div>
              </div>
            ) : view ? (
              <div className="an-full-bars">
                {view.map((r) => (
                  <div className="rbar lg" key={r.label}>
                    <span className="rbar-l" title={r.label}>{r.label}</span>
                    <div className="rbar-track"><i style={{ width: `${Math.max(2, (r.pct / maxPct) * 100)}%`, background: r.color ?? "var(--neon)" }} /></div>
                    <span className="rbar-v">{r.value}</span>
                  </div>
                ))}
                {view.length === 0 && <div className="q-note" style={{ padding: 40 }}>No rows match these filters.</div>}
              </div>
            ) : (
              <div className="an-full-plain">{renderCard(card)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderCard(c: Card) {
  if (c.type === "donut") return <Donut data={c.data} centerLabel={c.center} />;
  if (c.type === "spark") return <div style={{ padding: "8px 4px" }}><Sparkline data={c.data} height={140} /></div>;
  if (c.type === "quota") {
    const q = c.data;
    return (
      <div className="quota">
        <div className="quota-top"><span className="quota-actual">{q.actual}</span><span className="quota-pct" style={{ color: q.pct >= 100 ? "var(--neon)" : "var(--muted)" }}>{q.pct}%</span></div>
        <div className="quota-track"><i style={{ width: `${Math.min(100, q.pct)}%` }} /></div>
        <div className="quota-foot"><span>{q.deals} deals · goal {q.goal}</span><span>{q.pct >= 100 ? "🎯 Goal smashed" : "in progress"}</span></div>
      </div>
    );
  }
  if (c.type === "funnel") {
    const top = Math.max(1, c.data[0]?.value ?? 1);
    return (
      <div className="funnel-chart">
        {c.data.map((s, i) => {
          const pct = (s.value / top) * 100;
          const conv = i > 0 && c.data[i - 1].value ? Math.round((s.value / c.data[i - 1].value) * 100) : null;
          return (
            <div className="fc-step" key={s.label}>
              <div className="fc-bar-wrap"><div className="fc-bar" style={{ width: `${Math.max(8, pct)}%` }}><span>{s.value}</span></div></div>
              <div className="fc-meta"><span className="fc-l">{s.label}</span>{conv !== null && <span className="fc-conv">{conv}%</span>}</div>
            </div>
          );
        })}
      </div>
    );
  }
  if (c.type === "forecast") {
    const f = c.data;
    const max = Math.max(1, ...f.rows.map((r) => r.pct));
    return (
      <div className="forecast">
        <div className="fcast-top">
          <div><span className="fcast-l">Committed</span><b className="font-display" style={{ color: "var(--neon)" }}>{f.committed}</b></div>
          <div><span className="fcast-l">Weighted</span><b className="font-display" style={{ color: "var(--violet-br)" }}>{f.weighted}</b></div>
          <div><span className="fcast-l">Best case</span><b className="font-display">{f.best}</b></div>
        </div>
        {f.rows.map((r) => (
          <div className="rbar" key={r.label}><span className="rbar-l">{r.label}</span><div className="rbar-track"><i style={{ width: `${Math.max(3, (r.pct / max) * 100)}%`, background: "var(--violet-br)" }} /></div><span className="rbar-v">{r.value}</span></div>
        ))}
      </div>
    );
  }
  if (c.type === "bars") {
    const max = Math.max(1, ...c.data.map((b) => b.pct));
    return c.data.map((b) => (
      <div className="rbar" key={b.label}>
        <span className="rbar-l" title={b.label}>{b.label}</span>
        <div className="rbar-track"><i style={{ width: `${Math.max(2, (b.pct / max) * 100)}%`, background: b.color ?? "var(--neon)" }} /></div>
        <span className="rbar-v">{b.value}</span>
      </div>
    ));
  }
  // stacked
  const max = Math.max(1, ...c.data.map((s) => s.total));
  return (
    <>
      {c.data.map((s) => (
        <div className="rbar" key={s.label}>
          <span className="rbar-l" title={s.label}>{s.label}</span>
          <div className="rbar-track" style={{ width: `${Math.max(4, (s.total / max) * 100)}%`, display: "flex" }}>
            {s.segs.map((g, i) => <i key={i} title={`${g.k}: ${g.v}`} style={{ width: `${(g.v / s.total) * 100}%`, background: g.color, borderRadius: 0 }} />)}
          </div>
          <span className="rbar-v">{s.total.toLocaleString("en-US")}</span>
        </div>
      ))}
    </>
  );
}
