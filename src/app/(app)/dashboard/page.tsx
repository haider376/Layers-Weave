import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import Topbar from "@/components/Topbar";
import NavPunk from "@/components/NavPunk";

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
  const board = new Map<string, { name: string; title: string; wins: number; avatarUrl: string | null }>();
  for (const d of won) {
    if (!d.owner) continue;
    const cur = board.get(d.owner.id) ?? { name: d.owner.name, title: d.owner.title, wins: 0, avatarUrl: d.owner.avatarUrl };
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
            <NavPunk name="dollar" size={14} />
            Pipeline value
          </div>
          <div className="val neon">{money(pipelineValue)}</div>
          <div className="delta">{open.length} deals open</div>
        </div>
        <div className="kpi">
          <span className="bar" />
          <div className="lbl">
            <NavPunk name="trophy" size={14} />
            Won this month
          </div>
          <div className="val neon">{money(wonValue)}</div>
          <div className="delta">{won.length} deals closed</div>
        </div>
        <div className="kpi v">
          <span className="bar" />
          <div className="lbl">
            <NavPunk name="calendar" size={14} />
            SQLs booked
          </div>
          <div className="val vio">{meetings}</div>
          <div className="delta">last 7 days</div>
        </div>
        <div className="kpi">
          <span className="bar" />
          <div className="lbl">
            <NavPunk name="phone" size={14} />
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
              {activities.length === 0 && <EmptyState text="No activity yet" sub="Wins and updates will land here." />}
            </div>
          </section>

          <section className="panel">
            <div className="panel-h"><h2>AE leaderboard</h2><span className="count">deals won</span></div>
            <div className="lead">
              {leaderboard.map((p) => (
                <div className="lrow" key={p.name}>
                  <Avatar name={p.name} avatarUrl={p.avatarUrl} className="av" />
                  <span className="nm">{p.name}<small>{p.title}</small></span>
                  <span className="mt">{p.wins}</span>
                </div>
              ))}
              {leaderboard.length === 0 && <EmptyState text="No wins yet" sub="Close a deal to hit the board." />}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
