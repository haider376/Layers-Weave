"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "@/components/Toast";
import NumberInput from "@/components/ui/NumberInput";
import { saveGoalsAction } from "@/app/actions/goals";
import { ROSTER, toMonthly, type SalesGoals, type Weekly } from "@/lib/goals";

export type AeMeta = { first: string; name: string; kind: "AE" | "BDR" };

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// In-depth goal editor. Targets are authored WEEKLY (the spec unit); the editor
// previews the auto-derived monthly figure (weekly × 4) and the live team total.
export default function GoalsSettings({ initial, reps }: { initial: SalesGoals; reps: AeMeta[] }) {
  const router = useRouter();
  const [goals, setGoals] = useState<SalesGoals>(initial);
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [pending, start] = useTransition();

  const setMetric = (first: string, k: keyof Weekly, v: number) =>
    setGoals((g) => ({ ...g, weekly: { ...g.weekly, [first]: { ...g.weekly[first], [k]: v } } }));

  const team = useMemo(() => {
    const blank: Weekly = { revenue: 0, sql: 0, sqm: 0, sqo: 0, calls: 0 };
    return ROSTER.reduce((acc, { first }) => {
      const w = goals.weekly[first] ?? blank;
      const g = view === "monthly" ? toMonthly(w) : w;
      (Object.keys(blank) as (keyof Weekly)[]).forEach((k) => (acc[k] += g[k]));
      return acc;
    }, { ...blank });
  }, [goals, view]);

  function save() {
    start(async () => {
      try { await saveGoalsAction(goals); showToast("Goals saved"); router.refresh(); }
      catch { showToast("Not permitted"); }
    });
  }

  // Show weekly values in the inputs, but if monthly is selected the user edits
  // monthly figures (we divide back to weekly on change).
  const factor = view === "monthly" ? 4 : 1;
  const shown = (first: string, k: keyof Weekly) => (goals.weekly[first]?.[k] ?? 0) * factor;
  const onChange = (first: string, k: keyof Weekly, v: number) => setMetric(first, k, factor === 1 ? v : Math.round(v / factor));

  const aes = reps.filter((r) => r.kind === "AE");
  const bdrs = reps.filter((r) => r.kind === "BDR");

  const RepTable = ({ title, list, cols }: { title: string; list: AeMeta[]; cols: (keyof Weekly)[] }) => (
    <div className="gs-block">
      <div className="set-row-t" style={{ marginBottom: 2 }}>{title}</div>
      <div className="set-row-s" style={{ marginBottom: 12 }}>{view === "weekly" ? "Weekly" : "Monthly"} target per rep</div>
      <table className="gs-table">
        <thead><tr><th>Rep</th>{cols.map((c) => <th key={c}>{LABEL[c]}</th>)}</tr></thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.first}>
              <td style={{ fontWeight: 600 }}>{r.name}</td>
              {cols.map((c) => (
                <td key={c}>
                  <NumberInput value={shown(r.first, c)} onValueChange={(v) => onChange(r.first, c, v)} min={0} prefix={c === "revenue" ? "$" : undefined} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="gs">
      <div className="gs-toolbar">
        <div className="seg an-seg" style={{ maxWidth: 220 }}>
          {(["weekly", "monthly"] as const).map((v) => (
            <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
        <span className="set-row-s">Edit {view} figures · monthly = weekly × 4</span>
      </div>

      <div className="gs-block gs-team-block">
        <div className="set-row-t" style={{ marginBottom: 2 }}>Whole-team {view} goal</div>
        <div className="set-row-s" style={{ marginBottom: 12 }}>Auto-calculated — the sum of every rep below</div>
        <div className="gs-team">
          {TEAM_TILES.map((t) => (
            <div className="gs-tile" key={t.k}>
              <span className="gs-tile-v">{t.k === "revenue" ? money(team.revenue) : team[t.k].toLocaleString("en-US")}</span>
              <span className="gs-tile-l">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      <RepTable title="Account Executives" list={aes} cols={["revenue", "sql", "sqm", "sqo", "calls"]} />
      <RepTable title="Business Development Reps" list={bdrs} cols={["sql", "sqm", "calls"]} />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button className="btn ghost" style={{ flex: "none", padding: "10px 18px" }} onClick={() => setGoals(initial)} disabled={pending}>Reset</button>
        <button className="btn primary" style={{ flex: "none", padding: "10px 22px" }} onClick={save} disabled={pending}>{pending ? "Saving…" : "Save goals"}</button>
      </div>
    </div>
  );
}

const LABEL: Record<keyof Weekly, string> = { revenue: "Closed Won", sql: "SQL", sqm: "SQM", sqo: "SQO", calls: "Calls" };
const TEAM_TILES: { k: keyof Weekly; label: string }[] = [
  { k: "revenue", label: "Closed Won" }, { k: "sql", label: "SQL" }, { k: "sqm", label: "SQM" }, { k: "sqo", label: "SQO" }, { k: "calls", label: "Calls" },
];
