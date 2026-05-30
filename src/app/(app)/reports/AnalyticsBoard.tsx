"use client";

import { useEffect, useState } from "react";
import { Reorder, motion } from "framer-motion";
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

export default function AnalyticsBoard({ kpis, cards }: { kpis: Kpi[]; cards: Card[] }) {
  const [order, setOrder] = useState<string[]>(cards.map((c) => c.id));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lw-analytics-order") : null;
    if (saved) {
      try {
        const ids = JSON.parse(saved) as string[];
        const valid = ids.filter((id) => cards.some((c) => c.id === id));
        const missing = cards.map((c) => c.id).filter((id) => !valid.includes(id));
        setOrder([...valid, ...missing]);
      } catch { /* ignore */ }
    }
  }, [cards]);

  function persist(next: string[]) {
    setOrder(next);
    try { localStorage.setItem("lw-analytics-order", JSON.stringify(next)); } catch { /* ignore */ }
  }

  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const ordered = order.map((id) => byId[id]).filter(Boolean) as Card[];

  return (
    <>
      <div className="kpis" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        {kpis.map((k) => (
          <motion.div key={k.label} className={`kpi${k.accent === "vio" ? " v" : ""}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <span className="bar" />
            <div className="lbl">{k.label}</div>
            <div className={`val ${k.accent ?? ""}`}>{k.value}</div>
            <div className="delta">{k.sub}</div>
          </motion.div>
        ))}
      </div>

      <Reorder.Group axis="y" values={order} onReorder={persist} className="an-grid" as="div">
        {ordered.map((c) => (
          <Reorder.Item key={c.id} value={c.id} as="div" className={`an-card${expanded[c.id] ? " wide" : ""}`} whileDrag={{ scale: 1.02, zIndex: 5 }}>
            <div className="an-h">
              <span className="an-drag" title="Drag to reorder">⠿</span>
              <h2>{c.title}</h2>
              {c.hint && <span className="count">{c.hint}</span>}
              <button className="an-expand" title="Expand" onClick={() => setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))}>
                {expanded[c.id] ? "⤡" : "⤢"}
              </button>
            </div>
            <div className="an-body">{renderCard(c)}</div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </>
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
