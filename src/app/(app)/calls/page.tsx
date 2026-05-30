import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";
import Sparkline from "@/components/Sparkline";

const WIN = new Set(["Connected", "Meeting Booked"]);

export default async function CallsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const calls = await prisma.callLog.findMany({ take: 5000, orderBy: { createdAt: "desc" } });
  const total = calls.length;
  const wins = calls.filter((c) => c.outcome === "Meeting Booked").length;
  const connects = calls.filter((c) => WIN.has(c.outcome ?? "")).length;
  const winRate = total ? Math.round((connects / total) * 100) : 0;

  // per-agent
  type Row = { agent: string; calls: number; wins: number; connects: number; noAnswer: number };
  const map = new Map<string, Row>();
  for (const c of calls) {
    const a = c.agent ?? "—";
    const r = map.get(a) ?? { agent: a, calls: 0, wins: 0, connects: 0, noAnswer: 0 };
    r.calls++;
    if (c.outcome === "Meeting Booked") r.wins++;
    if (WIN.has(c.outcome ?? "")) r.connects++;
    if (c.outcome === "No answer") r.noAnswer++;
    map.set(a, r);
  }
  const agents = [...map.values()].sort((a, b) => b.calls - a.calls);

  // last 14 days trend
  const days = 14;
  const trend = Array.from({ length: days }, (_, i) => {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - (days - 1 - i));
    const next = new Date(day); next.setDate(next.getDate() + 1);
    return calls.filter((c) => c.createdAt >= day && c.createdAt < next).length;
  });

  // coaching insights
  const insights: { agent: string; tone: "warn" | "good" | "tip"; text: string }[] = [];
  for (const r of agents) {
    const cr = r.calls ? r.connects / r.calls : 0;
    const na = r.calls ? r.noAnswer / r.calls : 0;
    if (na > 0.45) insights.push({ agent: r.agent, tone: "warn", text: `${Math.round(na * 100)}% no-answer — test new call windows (early AM / post-5pm).` });
    else if (cr < 0.1 && r.calls > 50) insights.push({ agent: r.agent, tone: "tip", text: `Low connect rate (${Math.round(cr * 100)}%) — tighten the opener & lead with value.` });
    else if (r.wins > 8) insights.push({ agent: r.agent, tone: "good", text: `Strong booker (${r.wins} meetings) — clone their call script for the team.` });
  }

  return (
    <>
      <Topbar title="Call Analyzer" sub="AI-assisted call analytics & coaching for the sales floor" />

      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi"><span className="bar" /><div className="lbl">Calls analyzed</div><div className="val neon">{total.toLocaleString("en-US")}</div><div className="delta">across the team</div></div>
        <div className="kpi v"><span className="bar" /><div className="lbl">Avg win rate</div><div className="val vio">{winRate}%</div><div className="delta">connect + booked</div></div>
        <div className="kpi"><span className="bar" /><div className="lbl">Calls won</div><div className="val neon">{wins.toLocaleString("en-US")}</div><div className="delta">meetings booked</div></div>
      </div>

      <div className="grid2" style={{ gridTemplateColumns: "1fr 360px" }}>
        <section className="panel">
          <div className="panel-h"><h2>Team performance</h2><span className="count">calls · last 14 days</span></div>
          <div style={{ padding: "18px 18px 8px" }}><Sparkline data={trend} /></div>
          <div style={{ padding: "0 18px 16px" }}>
            <table>
              <thead><tr><th>Agent</th><th>Calls</th><th>Win rate</th><th>Booked</th></tr></thead>
              <tbody>
                {agents.map((r) => {
                  const wr = r.calls ? Math.round((r.connects / r.calls) * 100) : 0;
                  return (
                    <tr className="row" key={r.agent}>
                      <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="mini-av">{initials(r.agent)}</span>{r.agent}</span></td>
                      <td className="tabular-nums">{r.calls.toLocaleString("en-US")}</td>
                      <td><span className="st work" style={{ minWidth: 52 }}><span className="d" />{wr}%</span></td>
                      <td className="tabular-nums">{r.wins}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-h"><h2>Coaching insights</h2><span className="count">{insights.length}</span></div>
          <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {insights.map((c, i) => (
              <div className={`coach coach-${c.tone}`} key={i}>
                <div className="coach-top"><span className="mini-av">{initials(c.agent)}</span><b>{c.agent}</b></div>
                <div className="coach-text">{c.text}</div>
              </div>
            ))}
            {insights.length === 0 && <div className="q-note" style={{ padding: 12 }}>No coaching flags — team's dialing well.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
