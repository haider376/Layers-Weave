"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import { saveGoalsAction } from "@/app/actions/goals";
import type { SalesGoals } from "@/lib/goals";

export type AeMeta = { first: string; name: string };

// In-depth monthly goal editor: one team-wide target + per-AE individual
// targets for revenue, SQLs and calls. Admin-only; drives the Goals page.
export default function GoalsSettings({ initial, aes }: { initial: SalesGoals; aes: AeMeta[] }) {
  const router = useRouter();
  const [goals, setGoals] = useState<SalesGoals>(initial);
  const [pending, start] = useTransition();

  const setTeam = (k: keyof SalesGoals["team"], v: number) => setGoals((g) => ({ ...g, team: { ...g.team, [k]: v } }));
  const setInd = (first: string, k: "revenue" | "sqls" | "calls", v: number) =>
    setGoals((g) => ({ ...g, individual: { ...g.individual, [first]: { ...(g.individual[first] ?? { revenue: 0, sqls: 0, calls: 0 }), [k]: v } } }));

  const teamFromIndividuals = aes.reduce(
    (acc, a) => {
      const ind = goals.individual[a.first] ?? { revenue: 0, sqls: 0, calls: 0 };
      acc.revenue += ind.revenue; acc.sqls += ind.sqls; acc.calls += ind.calls;
      return acc;
    },
    { revenue: 0, sqls: 0, calls: 0 },
  );

  function save() {
    start(async () => {
      try { await saveGoalsAction(goals); showToast("Goals saved"); router.refresh(); }
      catch { showToast("Not permitted"); }
    });
  }

  const num = (v: number, on: (n: number) => void, prefix?: string) => (
    <div className="gs-num">{prefix && <span className="gs-pre">{prefix}</span>}<input type="number" min={0} value={v} onChange={(e) => on(Math.max(0, +e.target.value || 0))} /></div>
  );

  return (
    <div className="gs">
      <div className="gs-block">
        <div className="gs-block-h">
          <div><div className="set-row-t">Team monthly goal</div><div className="set-row-s">Whole-sales-team targets shown on the Goals dashboard</div></div>
          <button className="gs-sync" onClick={() => setGoals((g) => ({ ...g, team: teamFromIndividuals }))} title="Set team goal to the sum of individual goals">↑ Sum of AEs</button>
        </div>
        <div className="gs-team">
          <label className="gs-field"><span>Revenue</span>{num(goals.team.revenue, (n) => setTeam("revenue", n), "$")}</label>
          <label className="gs-field"><span>SQLs</span>{num(goals.team.sqls, (n) => setTeam("sqls", n))}</label>
          <label className="gs-field"><span>Calls</span>{num(goals.team.calls, (n) => setTeam("calls", n))}</label>
        </div>
        <div className="gs-hint">Individuals currently sum to <b>${teamFromIndividuals.revenue.toLocaleString("en-US")}</b> · {teamFromIndividuals.sqls} SQLs · {teamFromIndividuals.calls} calls.</div>
      </div>

      <div className="gs-block">
        <div className="set-row-t" style={{ marginBottom: 4 }}>Individual AE goals</div>
        <div className="set-row-s" style={{ marginBottom: 12 }}>Monthly target per Account Executive</div>
        <table className="gs-table">
          <thead><tr><th>AE</th><th>Revenue</th><th>SQLs</th><th>Calls</th></tr></thead>
          <tbody>
            {aes.map((a) => {
              const ind = goals.individual[a.first] ?? { revenue: 0, sqls: 0, calls: 0 };
              return (
                <tr key={a.first}>
                  <td style={{ fontWeight: 600 }}>{a.name}</td>
                  <td>{num(ind.revenue, (n) => setInd(a.first, "revenue", n), "$")}</td>
                  <td>{num(ind.sqls, (n) => setInd(a.first, "sqls", n))}</td>
                  <td>{num(ind.calls, (n) => setInd(a.first, "calls", n))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button className="btn ghost" style={{ flex: "none", padding: "10px 18px" }} onClick={() => setGoals(initial)} disabled={pending}>Reset</button>
        <button className="btn primary" style={{ flex: "none", padding: "10px 22px" }} onClick={save} disabled={pending}>{pending ? "Saving…" : "Save goals"}</button>
      </div>
    </div>
  );
}
