import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const AE_FIRST = ["haider", "zikriya", "rija", "hilmand", "asjad", "adan", "kamila"];

export default async function GoalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [users, deals, meetings, calls] = await Promise.all([
    prisma.user.findMany(),
    prisma.deal.findMany({ where: { stage: "Closed Won" } }),
    prisma.salesMeeting.findMany({ where: { bookedDate: { gte: new Date(Date.now() - 30 * 86400000) } } }),
    safe(prisma.callLog.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }), []),
  ]);

  const MONTHLY_REV = 30000, MONTHLY_SQL = 20, MONTHLY_CALLS = 800;

  const teamRev = deals.reduce((s, d) => s + d.amount, 0);
  const teamSql = meetings.length;
  const teamCalls = calls.length;

  const aes = users.filter((u) => AE_FIRST.includes(u.name.split(" ")[0].toLowerCase()));
  const rows = aes.map((u) => {
    const rev = deals.filter((d) => d.ownerId === u.id).reduce((s, d) => s + d.amount, 0);
    const sql = meetings.filter((m) => m.aeId === u.id).length;
    const myCalls = calls.filter((c) => c.agent === u.name).length;
    return { name: u.name, rev, sql, myCalls, pct: Math.round((rev / 6000) * 100) };
  }).sort((a, b) => b.rev - a.rev);

  const TeamGoal = ({ label, actual, goal, fmt }: { label: string; actual: number; goal: number; fmt?: (n: number) => string }) => {
    const pct = Math.min(100, Math.round((actual / goal) * 100));
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
      <Topbar title="Goals" sub="Team & individual targets — revenue, SQLs, calls" />

      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <TeamGoal label="Team revenue" actual={teamRev} goal={MONTHLY_REV} fmt={money} />
        <TeamGoal label="Team SQLs" actual={teamSql} goal={MONTHLY_SQL} />
        <TeamGoal label="Team calls" actual={teamCalls} goal={MONTHLY_CALLS} />
      </div>

      <section className="panel">
        <div className="panel-h"><h2>Individual targets</h2><span className="count">monthly · $6k rev / AE</span></div>
        <table>
          <thead><tr><th>AE</th><th>Revenue</th><th>Attainment</th><th>SQLs</th><th>Calls</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr className="row" key={r.name}>
                <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="mini-av">{initials(r.name)}</span>{r.name}</span></td>
                <td className="tabular-nums" style={{ color: "var(--neon)", fontWeight: 700 }}>{money(r.rev)}</td>
                <td style={{ minWidth: 160 }}>
                  <div className="goal-track"><i style={{ width: `${Math.min(100, r.pct)}%`, background: r.pct >= 100 ? "var(--neon)" : "var(--muted)" }} /></div>
                  <span style={{ fontSize: 10, color: "var(--faint)" }}>{r.pct}%{r.pct >= 100 ? " 🎯" : ""}</span>
                </td>
                <td className="tabular-nums">{r.sql}</td>
                <td className="tabular-nums">{r.myCalls.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
