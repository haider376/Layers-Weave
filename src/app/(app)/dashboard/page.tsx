import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";

const STAGES = [
  "Appointment Scheduled",
  "Showed up",
  "No Show / Reschedule",
  "Initiation",
  "Handpick / Bulk Vintage",
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

  const [deals, quotes, fulfilments, activities] = await Promise.all([
    prisma.deal.findMany({ include: { owner: true } }),
    prisma.quote.findMany(),
    prisma.fulfilment.findMany(),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  const open = deals.filter((d) => !["Closed Won", "Closed Lost", "Disqualified"].includes(d.stage));
  const pipelineValue = open.reduce((s, d) => s + d.amount, 0);
  const won = deals.filter((d) => d.stage === "Closed Won");
  const wonValue = won.reduce((s, d) => s + d.amount, 0);

  const activeQuotes = quotes.filter((q) => q.status === "In Progress");
  const bulk = activeQuotes.filter((q) => q.type === "Bulk").length;
  const handpick = activeQuotes.filter((q) => q.type === "Handpick").length;
  const inTransit = fulfilments.filter((f) => f.orderStage !== "Delivered").length;

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
      <Topbar title="Dashboard" sub="Company-wide view across Sales, Supply and Logistics" />

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
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
            Active quotes
          </div>
          <div className="val vio">{activeQuotes.length}</div>
          <div className="delta">{bulk} bulk · {handpick} handpick</div>
        </div>
        <div className="kpi a">
          <span className="bar" />
          <div className="lbl">
            <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 7h11v8H3z" /><path d="M14 10h4l3 3v2h-7z" /></svg>
            In transit
          </div>
          <div className="val">{inTransit}</div>
          <div className="delta">Expost · ECL · Rapidex</div>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="panel">
            <div className="panel-h"><h2>Cross-team activity</h2></div>
            <div className="feed">
              {activities.map((a) => (
                <div className={`ev ${a.kind}`} key={a.id}>
                  <div className="ic">
                    {a.kind === "sale" && <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>}
                    {a.kind === "supply" && <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4 8 4 8-4z" /><path d="M4 7v10l8 4 8-4V7" /></svg>}
                    {a.kind === "ship" && <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 7h11v8H3z" /><path d="M14 10h4l3 3v2h-7z" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></svg>}
                  </div>
                  <div>
                    <div className="bd">{a.body}</div>
                    <div className="tm">{a.actor ? `${a.actor} · ` : ""}{timeAgo(a.createdAt)}</div>
                  </div>
                </div>
              ))}
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
