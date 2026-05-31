"use client";

import Link from "next/link";
import { useState } from "react";
import Board, { type BoardDeal } from "./Board";

const STAGES = ["Appointment Scheduled", "Showed up", "No Show / Reschedule", "Initiation", "Handpick / Bulk Vintage", "Closed Won", "Closed Lost", "Disqualified"];
function stageCls(s: string) {
  if (s === "Closed Won") return "go"; if (s === "Closed Lost" || s === "Disqualified") return "bad";
  if (s === "No Show / Reschedule") return "wait"; return "work";
}

export default function DealsView({ deals }: { deals: BoardDeal[] }) {
  const [view, setView] = useState<"board" | "table" | "report">("board");

  return (
    <div>
      <div className="lv-toolbar">
        <div className="seg">{(["board", "table", "report"] as const).map((v) => <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
      </div>

      {view === "board" && <Board deals={deals} />}

      {view === "table" && (
        <section className="panel">
          <div className="panel-h"><h2>All deals</h2><span className="count">{deals.length}</span></div>
          <table>
            <thead><tr><th>Deal</th><th>Company</th><th>Stage</th><th>Owner</th><th>Amount</th></tr></thead>
            <tbody>
              {deals.map((d) => (
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

      {view === "report" && <DealsReport deals={deals} />}
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
