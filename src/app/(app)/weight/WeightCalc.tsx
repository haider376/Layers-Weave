"use client";

import { useMemo, useState } from "react";
import Select from "@/components/ui/Select";
import NumberInput from "@/components/ui/NumberInput";
import { showToast } from "@/components/Toast";

// Per-unit weight presets (kg) for common second-hand categories — "high estimate"
// uses the upper band so quotes are never under-weight.
const PRESETS: { cat: string; low: number; high: number }[] = [
  { cat: "T-shirts / tees", low: 0.15, high: 0.22 },
  { cat: "Shirts / blouses", low: 0.2, high: 0.3 },
  { cat: "Hoodies / sweatshirts", low: 0.45, high: 0.65 },
  { cat: "Knitwear / jumpers", low: 0.35, high: 0.55 },
  { cat: "Denim / jeans", low: 0.5, high: 0.75 },
  { cat: "Carhartt jackets", low: 0.8, high: 1.1 },
  { cat: "Heavy coats / parkas", low: 1.1, high: 1.7 },
  { cat: "Fleece / Patagonia", low: 0.4, high: 0.6 },
  { cat: "Trousers / chinos", low: 0.4, high: 0.6 },
  { cat: "Shorts / skirts", low: 0.2, high: 0.35 },
  { cat: "Tracksuits / sets", low: 0.7, high: 1.0 },
  { cat: "Bags / accessories", low: 0.3, high: 0.6 },
  { cat: "Shoes / trainers (pair)", low: 0.7, high: 1.0 },
  { cat: "Custom / mixed", low: 0.3, high: 0.5 },
];

type Line = { id: number; cat: string; qty: number; packaging: number };
let nextId = 4;

const FREIGHT = (kg: number) => (kg < 100 ? "Air" : kg <= 1000 ? "LCL" : "FCL");

export default function WeightCalc() {
  const [lines, setLines] = useState<Line[]>([
    { id: 1, cat: "Carhartt jackets", qty: 240, packaging: 8 },
    { id: 2, cat: "Denim / jeans", qty: 800, packaging: 8 },
    { id: 3, cat: "Hoodies / sweatshirts", qty: 500, packaging: 8 },
  ]);
  const [ratePerKg, setRatePerKg] = useState(4.33);

  const rows = useMemo(() => lines.map((l) => {
    const preset = PRESETS.find((p) => p.cat === l.cat) ?? PRESETS[PRESETS.length - 1];
    const perItemHigh = preset.high * (1 + l.packaging / 100);
    const perItemLow = preset.low * (1 + l.packaging / 100);
    return {
      ...l, preset,
      perItemHigh, perItemLow,
      lineHigh: perItemHigh * l.qty,
      lineLow: perItemLow * l.qty,
    };
  }), [lines]);

  const totals = useMemo(() => {
    const high = rows.reduce((s, r) => s + r.lineHigh, 0);
    const low = rows.reduce((s, r) => s + r.lineLow, 0);
    const units = rows.reduce((s, r) => s + r.qty, 0);
    return { high, low, units, freight: FREIGHT(high), cost: high * ratePerKg };
  }, [rows, ratePerKg]);

  const kg = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString("en-US")} kg`;
  const money = (n: number) => "£" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function setLine(id: number, patch: Partial<Line>) { setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l))); }
  function add() { setLines((ls) => [...ls, { id: nextId++, cat: "Custom / mixed", qty: 0, packaging: 8 }]); }
  function rm(id: number) { setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.id !== id) : ls)); }

  return (
    <div className="wcalc">
      <div className="wcalc-build">
        <section className="ccard">
          <div className="ccard-h"><span className="n">1</span><h2>Items</h2></div>
          <div className="wc-head"><span>Category</span><span>Qty</span><span>Packaging %</span><span>Est. / item</span><span /></div>
          {rows.map((r) => (
            <div className="wc-line" key={r.id}>
              <Select value={r.cat} options={PRESETS.map((p) => p.cat)} onValueChange={(v) => setLine(r.id, { cat: v })} className="ui-grow" />
              <NumberInput className="ed num" value={r.qty} onValueChange={(v) => setLine(r.id, { qty: v })} min={0} />
              <NumberInput className="ed num" value={r.packaging} onValueChange={(v) => setLine(r.id, { packaging: v })} min={0} />
              <span className="wc-peritem">{kg(r.perItemHigh)}<small>{kg(r.perItemLow)} low</small></span>
              <button className="rm" onClick={() => rm(r.id)}>×</button>
            </div>
          ))}
          <button className="addline" onClick={add}>+ Add item</button>
        </section>

        <section className="ccard">
          <div className="ccard-h"><span className="n">2</span><h2>Freight rate</h2></div>
          <div className="field" style={{ maxWidth: 220 }}>
            <label>Shipping rate / kg</label>
            <div className="inp"><span className="pre">£</span><NumberInput className="wc-bare" value={ratePerKg} onValueChange={setRatePerKg} min={0} step={0.01} /></div>
          </div>
          <p className="note" style={{ marginTop: 14 }}>
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            Estimates use the high band per category + packaging uplift, so quoted weight is never short. Freight auto-derives from total: Air &lt;100kg · LCL 100–1,000kg · FCL 1,000kg+.
          </p>
        </section>
      </div>

      <div className="wcalc-doc">
        <div className="wc-doc-h"><div className="eyebrow">Estimate</div><div className="wc-doc-title font-display">Shipped weight</div></div>
        <div className="wc-sum">
          <div className="ln"><span className="k">Total units</span><span className="v tabular-nums">{totals.units.toLocaleString("en-US")}</span></div>
          <div className="ln"><span className="k">Low estimate</span><span className="v tabular-nums">{kg(totals.low)}</span></div>
          <div className="ln"><span className="k">Freight type <small>auto</small></span><span className="v"><span className="grade">{totals.freight}</span></span></div>
          <div className="ln"><span className="k">Est. freight cost</span><span className="v tabular-nums">{money(totals.cost)}</span></div>
        </div>
        <div className="total"><span className="k">High estimate</span><span className="v">{kg(totals.high)}</span></div>
        <div className="cact">
          <button className="btn ghost" onClick={() => { setLines([{ id: nextId++, cat: "Custom / mixed", qty: 0, packaging: 8 }]); }}>Clear</button>
          <button className="btn primary" onClick={() => showToast(`Estimate: ${kg(totals.high)} · ${totals.freight}`)}>Copy estimate</button>
        </div>
      </div>
    </div>
  );
}
