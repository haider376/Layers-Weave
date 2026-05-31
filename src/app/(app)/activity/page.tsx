import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Topbar from "@/components/Topbar";
import NavPunk from "@/components/NavPunk";

function timeAgo(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const ICON: Record<string, React.ReactNode> = {
  note: <NavPunk name="note" size={15} />,
  email: <NavPunk name="mail" size={15} />,
  call: <NavPunk name="phone" size={15} />,
  system: <NavPunk name="check" size={15} />,
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
