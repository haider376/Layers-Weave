"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import FilterBar, { type FilterDef, type FilterState } from "@/components/ui/FilterBar";
import Board, { type BoardDeal } from "./Board";

const STAGES = ["Appointment Scheduled", "Showed up", "No Show / Reschedule", "Initiation", "Handpick / Bulk Vintage", "Closed Won", "Closed Lost", "Disqualified"];
function stageCls(s: string) {
  if (s === "Closed Won") return "go"; if (s === "Closed Lost" || s === "Disqualified") return "bad";
  if (s === "No Show / Reschedule") return "wait"; return "work";
}

export default function DealsView({ deals }: { deals: BoardDeal[] }) {
  const [view, setView] = useState<"board" | "table" | "report">("board");
  const [q, setQ] = useState("");
  const [fstate, setFstate] = useState<FilterState>({});

  const filterDefs: FilterDef[] = useMemo(() => {
    const uniq = (arr: (string | null | undefined)[]) => [...new Set(arr.filter((x): x is string => !!x && x !== "—"))].sort();
    return [
      { key: "stage", label: "Stage", type: "multi", options: STAGES.map((s) => ({ value: s, label: s })) },
      { key: "ownerName", label: "Owner", type: "multi", options: uniq(deals.map((d) => d.ownerName)).map((o) => ({ value: o, label: o })) },
      { key: "company", label: "Company", type: "multi", options: uniq(deals.map((d) => d.company)).map((c) => ({ value: c, label: c })) },
    ];
  }, [deals]);

  const filtered = useMemo(() => {
    let r = deals;
    for (const def of filterDefs) {
      const v = fstate[def.key];
      if (def.type === "multi" && Array.isArray(v) && v.length) {
        r = r.filter((d) => v.includes(String((d as unknown as Record<string, unknown>)[def.key] ?? "")));
      }
    }
    if (q.trim()) {
      const t = q.toLowerCase();
      r = r.filter((d) => d.name.toLowerCase().includes(t) || (d.company ?? "").toLowerCase().includes(t) || (d.ownerName ?? "").toLowerCase().includes(t));
    }
    return r;
  }, [deals, q, fstate, filterDefs]);

  return (
    <div>
      <div className="lv-toolbar">
        <div className="seg">{(["board", "table", "report"] as const).map((v) => <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
        <input className="ed lv-search" style={{ border: "1px solid var(--line-2)" }} placeholder="Filter deals…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <FilterBar filters={filterDefs} state={fstate} onChange={(k, v) => setFstate((s) => ({ ...s, [k]: v }))} onClear={() => setFstate({})} />

      {view === "board" && <Board deals={filtered} />}

      {view === "table" && (
        <section className="panel">
          <div className="panel-h"><h2>All deals</h2><span className="count">{filtered.length}</span></div>
          <table>
            <thead><tr><th>Deal</th><th>Company</th><th>Stage</th><th>Owner</th><th>Amount</th></tr></thead>
            <tbody>
              {filtered.map((d) => (
                <tr className="row" key={d.id}>
                  <td><Link href={`?deal=${d.id}`} scroll={false} style={{ fontWeight: 600, textDecoration: "none" }}>{d.name}</Link></td>
                  <td>{d.company ?? "—"}</td>
                  <td><span className={`st ${stageCls(d.stage)}`}><span className="d" />{d.stage}</span></td>
                  <td>{(d.ownerName ?? "—").split(" ")[0]}</td>
                  <td className="tabular-nums" style={{ color: "var(--neon)", fontWeight: 700 }}>${d.amount.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {view === "report" && <DealsReport deals={filtered} />}
    </div>
  );
}

function DealsReport({ deals }: { deals: BoardDeal[] }) {
  const open = deals.filter((d) => !["Closed Won", "Closed Lost", "Disqualified"].includes(d.stage));
  const won = deals.filter((d) => d.stage === "Closed Won");
  const byStage = STAGES.map((s) => [s, deals.filter((d) => d.stage === s).length] as [string, number]);
  const stageMax = Math.max(1, ...byStage.map((b) => b[1]));
  const byOwner = Object.entries(deals.reduce((m, d) => { const k = d.ownerName ?? "—"; m[k] = (m[k] ?? 0) + d.amount; return m; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const ownMax = Math.max(1, ...byOwner.map((x) => x[1]));
  return (
    <div className="an-grid">
      <div className="kpis" style={{ gridColumn: "1 / -1", gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi"><span className="bar" /><div className="lbl">Open deals</div><div className="val neon">{open.length}</div><div className="delta">in play</div></div>
        <div className="kpi v"><span className="bar" /><div className="lbl">Pipeline value</div><div className="val vio">${Math.round(open.reduce((s, d) => s + d.amount, 0)).toLocaleString("en-US")}</div><div className="delta">open</div></div>
        <div className="kpi"><span className="bar" /><div className="lbl">Won</div><div className="val neon">${Math.round(won.reduce((s, d) => s + d.amount, 0)).toLocaleString("en-US")}</div><div className="delta">{won.length} deals</div></div>
        <div className="kpi a"><span className="bar" /><div className="lbl">Total deals</div><div className="val">{deals.length}</div><div className="delta">all stages</div></div>
      </div>
      <section className="an-card"><div className="an-h"><h2>By stage</h2></div><div className="an-body">{byStage.map(([s, n]) => <div className="rbar" key={s}><span className="rbar-l">{s}</span><div className="rbar-track"><i style={{ width: `${(n / stageMax) * 100}%`, background: "var(--violet-br)" }} /></div><span className="rbar-v">{n}</span></div>)}</div></section>
      <section className="an-card"><div className="an-h"><h2>Pipeline $ by owner</h2></div><div className="an-body">{byOwner.map(([o, v]) => <div className="rbar" key={o}><span className="rbar-l">{o}</span><div className="rbar-track"><i style={{ width: `${(v / ownMax) * 100}%`, background: "var(--neon)" }} /></div><span className="rbar-v">${Math.round(v / 1000)}k</span></div>)}</div></section>
    </div>
  );
}
