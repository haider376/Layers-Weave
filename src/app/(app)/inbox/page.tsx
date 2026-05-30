import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audiencesFor } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import InboxActions from "./InboxActions";

function timeAgo(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default async function InboxPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [notes, activities] = await Promise.all([
    prisma.notification.findMany({ where: { audience: { in: audiencesFor(user.role) } }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
  ]);
  const unread = notes.filter((n) => !n.read).length;

  return (
    <>
      <Topbar title="Inbox" sub="Notifications, mentions & cross-team activity" />
      <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <section className="panel">
          <div className="panel-h"><h2>Notifications</h2><span className="count">{unread} unread</span><InboxActions hasUnread={unread > 0} /></div>
          <div className="feed">
            {notes.map((n) => (
              <div className={`ev ${n.audience === "Sales" ? "sale" : n.audience === "Supply" ? "supply" : "ship"}`} key={n.id} style={{ opacity: n.read ? 0.6 : 1 }}>
                <div className="ic"><svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg></div>
                <div><div className="bd">{n.body}</div><div className="tm">{n.audience} · {timeAgo(n.createdAt)}</div></div>
              </div>
            ))}
            {notes.length === 0 && <div className="q-note" style={{ padding: 16 }}>You're all caught up.</div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-h"><h2>Activity</h2><span className="count">company-wide</span></div>
          <div className="feed">
            {activities.map((a) => (
              <div className={`ev ${a.kind}`} key={a.id}>
                <div className="ic"><svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 20v-6M6 20v-4M18 20v-9" /></svg></div>
                <div><div className="bd">{a.body}</div><div className="tm">{a.actor ? `${a.actor} · ` : ""}{timeAgo(a.createdAt)}</div></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
