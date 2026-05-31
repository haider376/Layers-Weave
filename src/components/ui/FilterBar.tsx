"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

export type FilterDef =
  | { key: string; label: string; type: "multi"; options: { value: string; label: string; badge?: string }[] }
  | { key: string; label: string; type: "date" };

export type FilterState = Record<string, string[] | { from?: string; to?: string }>;

// HubSpot-style filter header: a row of pill triggers that open branded
// popovers (multi-select with search, or a date range).
export default function FilterBar({
  filters, state, onChange, onClear,
}: {
  filters: FilterDef[];
  state: FilterState;
  onChange: (key: string, val: string[] | { from?: string; to?: string }) => void;
  onClear: () => void;
}) {
  const active = (k: string) => {
    const v = state[k];
    if (Array.isArray(v)) return v.length;
    if (v && typeof v === "object") return v.from || v.to ? 1 : 0;
    return 0;
  };
  const anyActive = filters.some((f) => active(f.key) > 0);

  return (
    <div className="fbar">
      {filters.map((f) => (
        <Popover.Root key={f.key}>
          <Popover.Trigger className={`fbar-pill${active(f.key) ? " on" : ""}`}>
            {f.label}
            {active(f.key) > 0 && <span className="fbar-count">{active(f.key)}</span>}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="fbar-pop" sideOffset={6} align="start">
              <div className="ui-select-anim">
                {f.type === "multi" ? <MultiFilter f={f} value={(state[f.key] as string[]) ?? []} onChange={(v) => onChange(f.key, v)} /> : <DateFilter value={(state[f.key] as { from?: string; to?: string }) ?? {}} onChange={(v) => onChange(f.key, v)} />}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ))}
      {anyActive && <button className="fbar-clear" onClick={onClear}>Clear all</button>}
    </div>
  );
}

function MultiFilter({ f, value, onChange }: { f: Extract<FilterDef, { type: "multi" }>; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const opts = f.options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div>
      <input className="ui-input" style={{ marginBottom: 8 }} placeholder={`Search ${f.label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="fbar-opts">
        {opts.map((o) => (
          <button key={o.value} className={`fbar-opt${value.includes(o.value) ? " sel" : ""}`} onClick={() => toggle(o.value)}>
            <span className={`fbar-check${value.includes(o.value) ? " on" : ""}`}>{value.includes(o.value) && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}</span>
            {o.badge ? <span className={`badge badge-${o.badge}`}>{o.label}</span> : <span>{o.label}</span>}
          </button>
        ))}
        {opts.length === 0 && <div className="q-note" style={{ padding: 10 }}>No matches.</div>}
      </div>
    </div>
  );
}

function DateFilter({ value, onChange }: { value: { from?: string; to?: string }; onChange: (v: { from?: string; to?: string }) => void }) {
  const presets: [string, () => { from: string; to: string }][] = [
    ["Today", () => { const d = new Date().toISOString().slice(0, 10); return { from: d, to: d }; }],
    ["Last 7 days", () => ({ from: new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) })],
    ["Last 30 days", () => ({ from: new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) })],
    ["This quarter", () => { const n = new Date(); const q = Math.floor(n.getMonth() / 3) * 3; return { from: new Date(n.getFullYear(), q, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) }; }],
  ];
  return (
    <div className="fbar-date">
      <div className="fbar-presets">{presets.map(([l, fn]) => <button key={l} onClick={() => onChange(fn())}>{l}</button>)}</div>
      <label className="fbar-dr">From<input className="ui-input" type="date" value={value.from ?? ""} onChange={(e) => onChange({ ...value, from: e.target.value })} /></label>
      <label className="fbar-dr">To<input className="ui-input" type="date" value={value.to ?? ""} onChange={(e) => onChange({ ...value, to: e.target.value })} /></label>
      <button className="fbar-clear" style={{ marginTop: 4 }} onClick={() => onChange({})}>Clear dates</button>
    </div>
  );
}
