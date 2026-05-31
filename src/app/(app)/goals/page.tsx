import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";
import { getSalesGoals, AE_FIRST } from "@/lib/goals";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default async function GoalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [users, deals, meetings, calls, goals] = await Promise.all([
    prisma.user.findMany(),
    prisma.deal.findMany({ where: { stage: "Closed Won" } }),
    prisma.salesMeeting.findMany({ where: { bookedDate: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    safe(prisma.callLog.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }), []),
    getSalesGoals(),
  ]);

  const teamRev = deals.reduce((s, d) => s + d.amount, 0);
  const teamSql = meetings.length;
  const teamCalls = calls.length;

  const aes = users.filter((u) => AE_FIRST.includes(u.name.split(" ")[0].toLowerCase()));
  const rows = aes.map((u) => {
    const first = u.name.split(" ")[0].toLowerCase();
    const g = goals.individual[first] ?? { revenue: 6000, sqls: 4, calls: 120 };
    const rev = deals.filter((d) => d.ownerId === u.id).reduce((s, d) => s + d.amount, 0);
    const sql = meetings.filter((m) => m.aeId === u.id).length;
    const myCalls = calls.filter((c) => c.agent === u.name).length;
    return { name: u.name, rev, sql, myCalls, goal: g, pct: Math.round((rev / Math.max(1, g.revenue)) * 100) };
  }).sort((a, b) => b.rev - a.rev);

  const TeamGoal = ({ label, actual, goal, fmt }: { label: string; actual: number; goal: number; fmt?: (n: number) => string }) => {
    const pct = Math.min(100, Math.round((actual / Math.max(1, goal)) * 100));
    const f = fmt ?? ((n: number) => String(n));
    return (
      <div className="kpi" style={{ minHeight: 0 }}>
        <span className="bar" />
        <div className="lbl">{label}</div>
        <div className="val neon">{f(actual)}</div>
        <div className="delta">{pct}% of {f(goal)} goal</div>
        <div className="goal-track" style={{ marginTop: 10 }}><i style={{ width: `${pct}%` }} /></div>
      </div>
    );
  };

  return (
    <>
      <Topbar title="Goals" sub="Team & individual monthly targets — revenue, SQLs, calls" />

      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <TeamGoal label="Team revenue" actual={teamRev} goal={goals.team.revenue} fmt={money} />
        <TeamGoal label="Team SQLs" actual={teamSql} goal={goals.team.sqls} />
        <TeamGoal label="Team calls" actual={teamCalls} goal={goals.team.calls} />
      </div>

      <section className="panel">
        <div className="panel-h"><h2>Individual targets</h2><span className="count">monthly{user.isAdmin ? " · edit in Settings → Goals" : ""}</span></div>
        <table>
          <thead><tr><th>AE</th><th>Revenue</th><th>Attainment</th><th>SQLs</th><th>Calls</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr className="row" key={r.name}>
                <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="mini-av">{initials(r.name)}</span>{r.name}</span></td>
                <td className="tabular-nums" style={{ color: "var(--neon)", fontWeight: 700 }}>{money(r.rev)}<small style={{ display: "block", color: "var(--faint)", fontWeight: 500 }}>goal {money(r.goal.revenue)}</small></td>
                <td style={{ minWidth: 160 }}>
                  <div className="goal-track"><i style={{ width: `${Math.min(100, r.pct)}%`, background: r.pct >= 100 ? "var(--neon)" : "var(--muted)" }} /></div>
                  <span style={{ fontSize: 10, color: "var(--faint)" }}>{r.pct}%{r.pct >= 100 ? " 🎯" : ""}</span>
                </td>
                <td className="tabular-nums">{r.sql}<small style={{ color: "var(--faint)" }}> / {r.goal.sqls}</small></td>
                <td className="tabular-nums">{r.myCalls.toLocaleString("en-US")}<small style={{ color: "var(--faint)" }}> / {r.goal.calls}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
