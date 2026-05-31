import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";
import PeriodTabs from "../reports/PeriodTabs";
import { getSalesGoals, teamTotals, toMonthly, kindOf, ROSTER, METRIC_LABEL, WEEKS_PER_MONTH, type Weekly } from "@/lib/goals";
import { metricsForOwner, type RepMetrics } from "@/lib/metrics";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { period: p = "weekly" } = await searchParams;
  const period: "weekly" | "monthly" = p === "monthly" ? "monthly" : "weekly";
  const windowDays = period === "monthly" ? 30 : 7;
  const since = new Date(Date.now() - windowDays * 86400000);

  const [users, deals, calls, goals] = await Promise.all([
    prisma.user.findMany(),
    prisma.deal.findMany({ where: { createDate: { gte: since } } }),
    safe(prisma.callLog.findMany({ where: { createdAt: { gte: since } } }), []),
    getSalesGoals(),
  ]);

  const callsByAgent = new Map<string, number>();
  for (const c of calls) callsByAgent.set(c.agent ?? "", (callsByAgent.get(c.agent ?? "") ?? 0) + 1);

  const goalFor = (first: string): Weekly => {
    const w = goals.weekly[first] ?? { revenue: 0, sql: 0, sqm: 0, sqo: 0, calls: 0 };
    return period === "monthly" ? toMonthly(w) : w;
  };

  // Build per-rep rows with actuals + goals.
  type Row = { name: string; first: string; kind: "AE" | "BDR"; actual: RepMetrics; goal: Weekly };
  const rows: Row[] = ROSTER.map(({ first, kind }) => {
    const u = users.find((x) => x.name.split(" ")[0].toLowerCase() === first);
    const actual = u ? metricsForOwner(deals, u.id, callsByAgent.get(u.name) ?? 0)
      : { revenue: 0, sql: 0, sqm: 0, sqo: 0, calls: 0 };
    return { name: u?.name ?? first.charAt(0).toUpperCase() + first.slice(1), first, kind, actual, goal: goalFor(first) };
  });

  const aeRows = rows.filter((r) => r.kind === "AE");
  const bdrRows = rows.filter((r) => r.kind === "BDR");

  const team = teamTotals(goals, period);
  const teamActual = rows.reduce((acc, r) => {
    acc.revenue += r.actual.revenue; acc.sql += r.actual.sql; acc.sqm += r.actual.sqm; acc.sqo += r.actual.sqo; acc.calls += r.actual.calls;
    return acc;
  }, { revenue: 0, sql: 0, sqm: 0, sqo: 0, calls: 0 });

  const pct = (a: number, g: number) => Math.min(100, Math.round((a / Math.max(1, g)) * 100));

  const TeamCard = ({ label, actual, goal, fmt }: { label: string; actual: number; goal: number; fmt?: (n: number) => string }) => {
    const f = fmt ?? ((n: number) => n.toLocaleString("en-US"));
    const p = pct(actual, goal);
    return (
      <div className="kpi" style={{ minHeight: 0 }}>
        <span className="bar" />
        <div className="lbl">{label}</div>
        <div className="val neon">{f(actual)}</div>
        <div className="delta">{p}% of {f(goal)}</div>
        <div className="goal-track" style={{ marginTop: 10 }}><i style={{ width: `${p}%` }} /></div>
      </div>
    );
  };

  const Cell = ({ a, g, fmt }: { a: number; g: number; fmt?: (n: number) => string }) => {
    const f = fmt ?? ((n: number) => n.toLocaleString("en-US"));
    const p = pct(a, g);
    return (
      <td style={{ minWidth: 116 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
          <b className="tabular-nums" style={{ color: p >= 100 ? "var(--neon)" : "var(--text)" }}>{f(a)}</b>
          <span className="tabular-nums" style={{ color: "var(--faint)" }}>/ {f(g)}</span>
        </div>
        <div className="goal-track"><i style={{ width: `${p}%`, background: p >= 100 ? "var(--neon)" : "var(--muted)" }} /></div>
      </td>
    );
  };

  return (
    <>
      <Topbar title="Sales Goals" sub="Team & individual targets — SQL · SQM · SQO · Closed Won · Calls" />
      <PeriodTabs period={period} basePath="/goals" options={["weekly", "monthly"]} />

      <div className="kpis" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <TeamCard label={`Team Closed Won`} actual={teamActual.revenue} goal={team.revenue} fmt={money} />
        <TeamCard label="Team SQL" actual={teamActual.sql} goal={team.sql} />
        <TeamCard label="Team SQM" actual={teamActual.sqm} goal={team.sqm} />
        <TeamCard label="Team SQO" actual={teamActual.sqo} goal={team.sqo} />
        <TeamCard label="Team Calls" actual={teamActual.calls} goal={team.calls} />
      </div>

      <section className="panel">
        <div className="panel-h"><h2>Account Executives</h2><span className="count">{period} target{user.isAdmin ? " · edit in Settings → Goals" : ""}</span></div>
        <table>
          <thead><tr><th>AE</th><th>{METRIC_LABEL.revenue}</th><th>SQL</th><th>SQM</th><th>SQO</th><th>Calls</th></tr></thead>
          <tbody>
            {aeRows.map((r) => (
              <tr className="row" key={r.first}>
                <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="mini-av">{initials(r.name)}</span>{r.name}</span></td>
                <Cell a={r.actual.revenue} g={r.goal.revenue} fmt={money} />
                <Cell a={r.actual.sql} g={r.goal.sql} />
                <Cell a={r.actual.sqm} g={r.goal.sqm} />
                <Cell a={r.actual.sqo} g={r.goal.sqo} />
                <Cell a={r.actual.calls} g={r.goal.calls} />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-h"><h2>Business Development Reps</h2><span className="count">top-of-funnel: SQL · SQM · Calls</span></div>
        <table>
          <thead><tr><th>BDR</th><th>SQL</th><th>SQM</th><th>Calls</th></tr></thead>
          <tbody>
            {bdrRows.map((r) => (
              <tr className="row" key={r.first}>
                <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="mini-av">{initials(r.name)}</span>{r.name}</span></td>
                <Cell a={r.actual.sql} g={r.goal.sql} />
                <Cell a={r.actual.sqm} g={r.goal.sqm} />
                <Cell a={r.actual.calls} g={r.goal.calls} />
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="q-note" style={{ textAlign: "center", padding: "10px 0", fontSize: 11.5, color: "var(--faint)" }}>
        Monthly goal = weekly × {WEEKS_PER_MONTH}. Team goal = sum of every rep. A deal that jumps straight to a deeper stage still credits the shallower metrics it passed (e.g. booked → Initiation counts SQL, SQM &amp; SQO).
      </p>
    </>
  );
}
