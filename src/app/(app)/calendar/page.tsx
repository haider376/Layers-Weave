import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { getConnection, listGoogleEvents, googleConfigured } from "@/lib/google";
import Topbar from "@/components/Topbar";
import CalendarView, { type CalEvent } from "./CalendarView";

// Render fresh every request so integration config (env vars) + Google events
// are never served from a stale cache.
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const conn = await safe(getConnection(user.id), { connected: false, accountEmail: null });

  // Pull a generous window of Google events when connected.
  const now = new Date();
  const winStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const winEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const googleEvents = conn.connected ? await safe(listGoogleEvents(user.id, winStart, winEnd), []) : [];

  const [meetings, tasks] = await Promise.all([
    prisma.salesMeeting.findMany({ where: { meetingDate: { not: null } }, include: { deal: { include: { company: true } } }, take: 400 }),
    safe(prisma.task.findMany({ where: { dueDate: { not: null } }, take: 400 }), []),
  ]);

  const events: CalEvent[] = [
    ...meetings.map((m) => ({ id: m.id, title: m.deal?.company.name ? `${m.deal.company.name} × Layers` : m.title, date: (m.meetingDate ?? m.bookedDate).toISOString(), kind: "meeting" as const, status: m.status, dealId: m.dealId })),
    ...tasks.map((t) => ({ id: t.id, title: t.title, date: t.dueDate!.toISOString(), kind: "task" as const, status: t.done ? "Done" : t.priority, dealId: t.dealId })),
    ...googleEvents.map((g) => ({ id: "g" + g.id, title: g.title, date: g.start, kind: "google" as const, status: "Google", dealId: null, link: g.htmlLink })),
  ];

  return (
    <>
      <Topbar title="Calendar" sub="Meetings, tasks & follow-ups — click any day to add" />
      <CalendarView events={events} google={{ connected: conn.connected, email: conn.accountEmail, configured: googleConfigured() }} />
    </>
  );
}
