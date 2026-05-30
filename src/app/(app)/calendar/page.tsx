import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import CalendarView, { type CalEvent } from "./CalendarView";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const [meetings, tasks] = await Promise.all([
    prisma.salesMeeting.findMany({ where: { meetingDate: { not: null } }, include: { deal: { include: { company: true } } }, take: 400 }),
    safe(prisma.task.findMany({ where: { dueDate: { not: null } }, take: 400 }), []),
  ]);

  const events: CalEvent[] = [
    ...meetings.map((m) => ({ id: m.id, title: m.deal?.company.name ? `${m.deal.company.name} × Layers` : m.title, date: (m.meetingDate ?? m.bookedDate).toISOString(), kind: "meeting" as const, status: m.status, dealId: m.dealId })),
    ...tasks.map((t) => ({ id: t.id, title: t.title, date: t.dueDate!.toISOString(), kind: "task" as const, status: t.done ? "Done" : t.priority, dealId: t.dealId })),
  ];

  return (
    <>
      <Topbar title="Calendar" sub="Meetings, tasks & follow-ups — click any day to add" />
      <CalendarView events={events} />
    </>
  );
}
