import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";
import Sparkline from "@/components/Sparkline";
import Donut from "@/components/Donut";

const SENT_COLORS: Record<string, string> = {
  "SQL Booked": "#A5EB00", "Interested / Follow up": "#8FCE00", "Call Back Later": "#D9A23A",
  "Not Interested": "#E2574E", "Left Voicemail": "#6D19FF", "No Answer": "#3A3352",
  "Stopped at Gatekeeper": "#A47BFF", "Wrong Number": "#E2574E",
};

export default async function CallsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const calls = await prisma.callLog.findMany({ take: 6000, orderBy: { createdAt: "desc" } });
  const total = calls.length;
  const connected = calls.filter((c) => c.connected).length;
  const sqls = calls.filter((c) => c.outcome === "SQL Booked").length;
  const connectRate = total ? Math.round((connected / total) * 100) : 0;
  const avgConn = (() => { const cs = calls.filter((c) => c.connected && c.durationSec); return cs.length ? Math.round(cs.reduce((s, c) => s + (c.durationSec ?? 0), 0) / cs.length / 60) : 0; })();

  // per agent
  type Row = { agent: string; calls: number; connected: number; sqls: number };
  const map = new Map<string, Row>();
  for (const c of calls) {
    const a = c.agent ?? "—";
    const r = map.get(a) ?? { agent: a, calls: 0, connected: 0, sqls: 0 };
    r.calls++; if (c.connected) r.connected++; if (c.outcome === "SQL Booked") r.sqls++;
    map.set(a, r);
  }
  const agents = [...map.values()].sort((a, b) => b.sqls - a.sqls || b.connected - a.connected);

  // sentiment breakdown
  const sentMap = new Map<string, number>();
  for (const c of calls) sentMap.set(c.outcome ?? "—", (sentMap.get(c.outcome ?? "—") ?? 0) + 1);
  const sentiment = [...sentMap.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: SENT_COLORS[label] ?? "#6F6982" }));
  const connDonut = [{ label: "Connected", value: connected, color: "#A5EB00" }, { label: "Not connected", value: total - connected, color: "#3A3352" }];

  const trend = Array.from({ length: 14 }, (_, i) => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - (13 - i));
    const d1 = new Date(d0); d1.setDate(d1.getDate() + 1);
    return calls.filter((c) => c.createdAt >= d0 && c.createdAt < d1).length;
  });

  const transcripts = calls.filter((c) => c.transcript).slice(0, 6);

  const insights = agents.slice(0, 6).map((r) => {
    const cr = r.calls ? r.connected / r.calls : 0;
    if (r.sqls >= 4) return { agent: r.agent, tone: "good", text: `Booking machine — ${r.sqls} SQLs. Clone the script.` };
    if (cr < 0.18 && r.calls > 40) return { agent: r.agent, tone: "warn", text: `Connect rate ${Math.round(cr * 100)}% — switch call windows & tighten the opener.` };
    return { agent: r.agent, tone: "tip", text: `${Math.round(cr * 100)}% connect · ${r.sqls} SQLs — push for the booking on connects.` };
  });

  return (
    <>
      <Topbar title="Call Analyzer" sub="AI call analytics, sentiment & coaching for the sales floor" />

      <div className="kpis" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi"><span className="bar" /><div className="lbl">Calls analyzed</div><div className="val neon">{total.toLocaleString("en-US")}</div><div className="delta">all reps</div></div>
        <div className="kpi v"><span className="bar" /><div className="lbl">Connect rate</div><div className="val vio">{connectRate}%</div><div className="delta">{connected.toLocaleString("en-US")} connected</div></div>
        <div className="kpi"><span className="bar" /><div className="lbl">SQLs booked</div><div className="val neon">{sqls}</div><div className="delta">on the phone</div></div>
        <div className="kpi a"><span className="bar" /><div className="lbl">Avg connect</div><div className="val">{avgConn}m</div><div className="delta">talk time</div></div>
      </div>

      <div className="an-grid">
        <section className="an-card"><div className="an-h"><h2>Connected vs not</h2></div><div className="an-body"><Donut data={connDonut} centerLabel="calls" /></div></section>
        <section className="an-card"><div className="an-h"><h2>Sentiment mix</h2></div><div className="an-body"><Donut data={sentiment} centerLabel="calls" /></div></section>
        <section className="an-card"><div className="an-h"><h2>Calls — 14 days</h2></div><div className="an-body"><Sparkline data={trend} height={150} /></div></section>

        <section className="an-card wide">
          <div className="an-h"><h2>Rep performance</h2><span className="count">by SQLs</span></div>
          <div className="an-body" style={{ paddingTop: 4 }}>
            <table>
              <thead><tr><th>Agent</th><th>Calls</th><th>Connect</th><th>SQLs</th></tr></thead>
              <tbody>
                {agents.map((r) => (
                  <tr className="row" key={r.agent}>
                    <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="mini-av">{initials(r.agent)}</span>{r.agent}</span></td>
                    <td className="tabular-nums">{r.calls.toLocaleString("en-US")}</td>
                    <td><span className="st work"><span className="d" />{r.calls ? Math.round((r.connected / r.calls) * 100) : 0}%</span></td>
                    <td className="tabular-nums">{r.sqls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="an-card">
          <div className="an-h"><h2>Coaching</h2></div>
          <div className="an-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insights.map((c, i) => (
              <div className={`coach coach-${c.tone}`} key={i}>
                <div className="coach-top"><span className="mini-av">{initials(c.agent)}</span><b>{c.agent}</b></div>
                <div className="coach-text">{c.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="an-card wide">
          <div className="an-h"><h2>Call transcripts</h2><span className="count">latest connects</span></div>
          <div className="an-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {transcripts.map((t) => (
              <details className="transcript" key={t.id}>
                <summary>
                  <span className="mini-av">{initials(t.agent ?? "—")}</span>
                  <span style={{ flex: 1 }}>{t.agent} · <span style={{ color: SENT_COLORS[t.outcome ?? ""] ?? "var(--muted)", fontWeight: 700 }}>{t.outcome}</span></span>
                  <span style={{ fontSize: 10, color: "var(--faint)" }}>{Math.round((t.durationSec ?? 0) / 60)}m</span>
                </summary>
                <pre className="transcript-body">{t.transcript}</pre>
              </details>
            ))}
            {transcripts.length === 0 && <div className="q-note" style={{ padding: 12 }}>No transcripts yet — connected calls with recordings will appear here.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
