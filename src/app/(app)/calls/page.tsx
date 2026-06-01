import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { zoomGetConnection, zoomConfigured } from "@/lib/zoom";
import Avatar from "@/components/Avatar";
import Topbar from "@/components/Topbar";
import Sparkline from "@/components/Sparkline";
import Donut from "@/components/Donut";
import ZoomBanner from "./ZoomBanner";

// Always fresh — Zoom connection state must not be cached.
export const dynamic = "force-dynamic";

const SENT_COLORS: Record<string, string> = {
  "SQL Booked": "#C6F542", "Interested / Follow up": "#A9DF1E", "Call Back Later": "#E0B23C",
  "Not Interested": "#F0594F", "Left Voicemail": "#8A8A90", "No Answer": "#2A2A2E",
  "Stopped at Gatekeeper": "#C9C9CC", "Wrong Number": "#F0594F",
};

export default async function CallsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const [calls, zconn, allUsers] = await Promise.all([
    safe(prisma.callLog.findMany({ take: 6000, orderBy: { createdAt: "desc" } }), []),
    safe(zoomGetConnection(), { connected: false, accountEmail: null }),
    safe(prisma.user.findMany({ select: { name: true, avatarUrl: true } }), []),
  ]);
  const avatarOf = (name: string) => allUsers.find((u) => u.name === name)?.avatarUrl ?? null;
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
  const sentiment = [...sentMap.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, color: SENT_COLORS[label] ?? "#646469" }));
  const connDonut = [{ label: "Connected", value: connected, color: "#C6F542" }, { label: "Not connected", value: total - connected, color: "#2A2A2E" }];

  const trend = Array.from({ length: 14 }, (_, i) => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - (13 - i));
    const d1 = new Date(d0); d1.setDate(d1.getDate() + 1);
    return calls.filter((c) => c.createdAt >= d0 && c.createdAt < d1).length;
  });

  const transcripts = calls.filter((c) => c.transcript || c.recordingUrl).slice(0, 6);

  const insights = agents.slice(0, 6).map((r) => {
    const cr = r.calls ? r.connected / r.calls : 0;
    if (r.sqls >= 4) return { agent: r.agent, tone: "good", text: `Booking machine — ${r.sqls} SQLs. Clone the script.` };
    if (cr < 0.18 && r.calls > 40) return { agent: r.agent, tone: "warn", text: `Connect rate ${Math.round(cr * 100)}% — switch call windows & tighten the opener.` };
    return { agent: r.agent, tone: "tip", text: `${Math.round(cr * 100)}% connect · ${r.sqls} SQLs — push for the booking on connects.` };
  });

  return (
    <>
      <Topbar title="Coaching" sub="AI call analytics, sentiment & coaching for the sales floor" />

      <ZoomBanner zoom={{ connected: zconn.connected, email: zconn.accountEmail, configured: zoomConfigured() }} />

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
                    <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Avatar name={r.agent} avatarUrl={avatarOf(r.agent)} className="mini-av" />{r.agent}</span></td>
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
                <div className="coach-top"><Avatar name={c.agent} avatarUrl={avatarOf(c.agent)} className="mini-av" /><b>{c.agent}</b></div>
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
                  <Avatar name={t.agent ?? "—"} avatarUrl={avatarOf(t.agent ?? "—")} className="mini-av" />
                  <span style={{ flex: 1 }}>{t.agent} · <span style={{ color: SENT_COLORS[t.outcome ?? ""] ?? "var(--muted)", fontWeight: 700 }}>{t.outcome}</span></span>
                  {t.recordingUrl && <a className="tl-rec" href={t.recordingUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>▶ Recording</a>}
                  <span style={{ fontSize: 10, color: "var(--faint)" }}>{Math.round((t.durationSec ?? 0) / 60)}m</span>
                </summary>
                {t.transcript
                  ? <pre className="transcript-body">{t.transcript}</pre>
                  : <div className="transcript-body" style={{ color: "var(--faint)" }}>No transcript — open the recording to listen.</div>}
              </details>
            ))}
            {transcripts.length === 0 && <div className="q-note" style={{ padding: 12 }}>No transcripts yet — connected calls with recordings will appear here.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
