import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import { listCadences, listDueSteps } from "@/lib/cadences";
import CadenceDashboard from "./CadenceDashboard";

function timeAgo(d: Date) {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default async function CadencesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const [cadences, dueSteps, recentCalls, recentMeetings] = await Promise.all([
    listCadences(),
    listDueSteps(),
    safe(prisma.callLog.findMany({ orderBy: { createdAt: "desc" }, take: 18, include: { contact: true } }), []),
    safe(prisma.salesMeeting.findMany({ orderBy: { bookedDate: "desc" }, take: 10, include: { deal: { include: { company: true } } } }), []),
  ]);

  // Live feed — merge recent calls + booked meetings, newest first.
  const feed = [
    ...recentCalls.map((c) => ({
      id: "c" + c.id, kind: "call" as const, who: c.contact?.name ?? "Unknown",
      detail: c.connected ? (c.outcome ?? "Connected") : (c.outcome ?? "No answer"),
      connected: c.connected, at: c.createdAt.toISOString(), ago: timeAgo(c.createdAt), agent: c.agent ?? "",
    })),
    ...recentMeetings.map((m) => ({
      id: "m" + m.id, kind: "meeting" as const, who: m.deal?.company?.name ?? m.title,
      detail: `Meeting ${m.status.toLowerCase()}`, connected: true, at: m.bookedDate.toISOString(), ago: timeAgo(m.bookedDate), agent: "",
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 20);

  // Today's rhythm + outcome counters for the header strip.
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const completedToday = await safe(prisma.cadenceStepRun.count({ where: { done: true, completedAt: { gte: startToday } } }), 0);
  const callsThisMonth = recentCalls.filter((c) => c.createdAt >= monthStart).length;
  const due = dueSteps.filter((d) => d.bucket === "overdue" || d.bucket === "today").length;
  const oppsCreated = await safe(prisma.deal.count({ where: { createDate: { gte: monthStart }, stage: { in: ["Initiation", "Closed Won"] } } }), 0);

  return (
    <>
      <Topbar title="Cadences" sub="Prospecting & relationship workflows — dial, email, track" />
      <CadenceDashboard
        cadences={cadences}
        dueSteps={dueSteps}
        feed={feed}
        me={user.name}
        stats={{ prioritized: due, completedToday, callsThisMonth, oppsCreated }}
      />
    </>
  );
}
