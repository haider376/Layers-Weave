import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Topbar from "@/components/Topbar";

function timeAgo(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const ICON: Record<string, React.ReactNode> = {
  note: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" /></svg>,
  email: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 6L2 7" /></svg>,
  call: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>,
  system: <svg fill="none" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>,
};

export default async function ActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [acts, emails, calls] = await Promise.all([
    prisma.activity.findMany({ where: { kind: "sale" }, orderBy: { createdAt: "desc" }, take: 60 }),
    safe(prisma.emailMessage.findMany({ orderBy: { createdAt: "desc" }, take: 30 }), []),
    safe(prisma.callLog.findMany({ where: { outcome: { not: null } }, orderBy: { createdAt: "desc" }, take: 30 }), []),
  ]);

  type Ev = { id: string; type: string; text: string; actor: string; at: Date };
  const events: Ev[] = [
    ...acts.map((a) => ({ id: a.id, type: a.type === "note" ? "note" : "system", text: a.body, actor: a.actor ?? "—", at: a.createdAt })),
    ...emails.map((e) => ({ id: e.id, type: "email", text: `${e.direction === "outbound" ? "Sent" : "Received"}: ${e.subject}`, actor: e.fromAddr.split("@")[0], at: e.createdAt })),
    ...calls.map((c) => ({ id: c.id, type: "call", text: `Call — ${c.outcome}`, actor: c.agent ?? "—", at: c.createdAt })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 80);

  return (
    <>
      <Topbar title="Activity Feed" sub="Every note, email & call across the sales floor" />
      <section className="panel">
        <div className="panel-h"><h2>Recent activity</h2><span className="count">{events.length}</span></div>
        <div className="timeline" style={{ padding: "8px 0 14px" }}>
          {events.map((e) => (
            <div className={`tl-ev ${e.type}`} key={e.id}>
              <div className="tl-ic">{ICON[e.type] ?? ICON.system}</div>
              <div className="tl-bd">
                <div className="tl-title">{e.text}</div>
                <div className="tl-when">{e.actor} · {timeAgo(e.at)}</div>
              </div>
            </div>
          ))}
          {events.length === 0 && <div className="q-note" style={{ padding: 20 }}>No activity yet.</div>}
        </div>
      </section>
    </>
  );
}
