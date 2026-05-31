import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";

const STAGES = [
  "Appointment Scheduled",
  "Showed up",
  "No Show / Reschedule",
  "Initiation",
  "Closed Won",
  "Closed Lost",
  "Disqualified",
];

function money(n: number) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function timeAgo(d: Date) {
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

export default async function DashboardPage() {
  await getCurrentUser();

  const [deals, meetings, calls, activities] = await Promise.all([
    prisma.deal.findMany({ include: { owner: true } }),
    prisma.salesMeeting.count({ where: { bookedDate: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    safe(prisma.callLog.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }), 0),
    // Sales-only activity feed (no supply/ship)
    prisma.activity.findMany({ where: { kind: "sale" }, orderBy: { createdAt: "desc" }, take: 7 }),
  ]);

  const open = deals.filter((d) => !["Closed Won", "Closed Lost", "Disqualified"].includes(d.stage));
  const pipelineValue = open.reduce((s, d) => s + d.amount, 0);
  const won = deals.filter((d) => d.stage === "Closed Won");
  const wonValue = won.reduce((s, d) => s + d.amount, 0);

  // Funnel
  const funnel = STAGES.map((s) => ({ name: s, count: deals.filter((d) => d.stage === s).length }));
  const fmax = Math.max(1, ...funnel.map((f) => f.count));

  // Leaderboard — closed-won per owner
  const board = new Map<string, { name: string; title: string; wins: number }>();
  for (const d of won) {
    if (!d.owner) continue;
    const cur = board.get(d.owner.id) ?? { name: d.owner.name, title: d.owner.title, wins: 0 };
    cur.wins += 1;
    board.set(d.owner.id, cur);
  }
  const leaderboard = [...board.values()].sort((a, b) => b.wins - a.wins).slice(0, 5);

  return (
    <>
      <Topbar title="Dashboard" sub="Your sales floor at a glance" />

      <div className="kpis">
        <div className="kpi">
          <span className="bar" />
          <div className="lbl">
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
            Pipeline value
          </div>
          <div className="val neon">{money(pipelineValue)}</div>
          <div className="delta">{open.length} deals open</div>
        </div>
        <div className="kpi">
          <span className="bar" />
          <div className="lbl">
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            Won this month
          </div>
          <div className="val neon">{money(wonValue)}</div>
          <div className="delta">{won.length} deals closed</div>
        </div>
        <div className="kpi v">
          <span className="bar" />
          <div className="lbl">
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            SQLs booked
          </div>
          <div className="val vio">{meetings}</div>
          <div className="delta">last 7 days</div>
        </div>
        <div className="kpi">
          <span className="bar" />
          <div className="lbl">
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>
            Calls
          </div>
          <div className="val">{calls.toLocaleString("en-US")}</div>
          <div className="delta">last 7 days</div>
        </div>
      </div>

      <div className="grid2">
        <section className="panel">
          <div className="panel-h"><h2>Pipeline by stage</h2><span className="count">live</span></div>
          <div className="funnel">
            {funnel.map((f) => (
              <div className="frow" key={f.name}>
                <span className="nm">{f.name}</span>
                <div className="ftrack"><i style={{ width: `${Math.round((f.count / fmax) * 100)}%` }} /></div>
                <span className="ct">{f.count}</span>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="panel">
            <div className="panel-h"><h2>Recent activity</h2></div>
            <div className="feed">
              {activities.map((a) => (
                <div className="ev sale" key={a.id}>
                  <div className="ic">
                    <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                  </div>
                  <div>
                    <div className="bd">{a.body}</div>
                    <div className="tm">{a.actor ? `${a.actor} · ` : ""}{timeAgo(a.createdAt)}</div>
                  </div>
                </div>
              ))}
              {activities.length === 0 && <div className="q-note" style={{ padding: 16 }}>No activity yet.</div>}
            </div>
          </section>

          <section className="panel">
            <div className="panel-h"><h2>AE leaderboard</h2><span className="count">deals won</span></div>
            <div className="lead">
              {leaderboard.map((p) => (
                <div className="lrow" key={p.name}>
                  <span className="av">{initials(p.name)}</span>
                  <span className="nm">{p.name}<small>{p.title}</small></span>
                  <span className="mt">{p.wins}</span>
                </div>
              ))}
              {leaderboard.length === 0 && <div className="q-note" style={{ padding: 16 }}>No wins yet.</div>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
