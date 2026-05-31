"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type CadenceRow = {
  id: string; name: string; function: string; priority: string; active: boolean; owner: string;
  steps: number; callSteps: number; emailSteps: number; activePeople: number; totalPeople: number;
  completed: number; stepsDue: number; updatedAt: string;
};

const FUNCS = ["All", "Inbound", "Outbound", "Event", "Other"];

// Salesloft Cadences-page table: searchable, filterable list with rollup metrics.
export default function CadenceList({ cadences }: { cadences: CadenceRow[] }) {
  const [q, setQ] = useState("");
  const [func, setFunc] = useState("All");
  const [sort, setSort] = useState<"due" | "active" | "name">("due");

  const rows = useMemo(() => {
    let r = cadences;
    if (func !== "All") r = r.filter((c) => c.function === func);
    if (q.trim()) { const t = q.toLowerCase(); r = r.filter((c) => c.name.toLowerCase().includes(t) || c.owner.toLowerCase().includes(t)); }
    return [...r].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : sort === "active" ? b.activePeople - a.activePeople : b.stepsDue - a.stepsDue);
  }, [cadences, q, func, sort]);

  return (
    <section className="panel">
      <div className="cadlist-toolbar">
        <input className="ui-input" style={{ maxWidth: 240 }} placeholder="Search cadences…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="cad-type-seg">
          {FUNCS.map((f) => <button key={f} className={func === f ? "on" : ""} onClick={() => setFunc(f)}>{f}</button>)}
        </div>
        <span style={{ flex: 1 }} />
        <div className="cad-type-seg">
          {([["due", "Steps due"], ["active", "Active"], ["name", "Name"]] as const).map(([k, l]) => (
            <button key={k} className={sort === k ? "on" : ""} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
      </div>
      <table className="cadlist">
        <thead>
          <tr><th>Cadence</th><th>Function</th><th>Steps</th><th>Steps due</th><th>Active</th><th>Total</th><th>Owner</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr className="row" key={c.id}>
              <td><Link href={`/cadences/${c.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>{c.name}</Link></td>
              <td><span className="cad-func">{c.function}</span></td>
              <td className="tabular-nums">{c.steps} <small style={{ color: "var(--faint)" }}>({c.callSteps}☎ {c.emailSteps}✉)</small></td>
              <td className="tabular-nums">{c.stepsDue > 0 ? <span className="cad-due-pill">{c.stepsDue}</span> : <span style={{ color: "var(--faint)" }}>0</span>}</td>
              <td className="tabular-nums">{c.activePeople}</td>
              <td className="tabular-nums">{c.totalPeople}</td>
              <td>{c.owner.split(" ")[0]}</td>
              <td><span className={`st ${c.active ? "go" : "bad"}`}><span className="d" />{c.active ? "Active" : "Paused"}</span></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8}><div className="q-note" style={{ padding: 36 }}>No cadences match.</div></td></tr>}
        </tbody>
      </table>
    </section>
  );
}
