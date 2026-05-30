import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import CalendarView, { type CalEvent } from "./CalendarView";

export default async function CalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const meetings = await prisma.salesMeeting.findMany({
    where: { meetingDate: { not: null } },
    include: { deal: { include: { company: true } }, ae: true },
    orderBy: { meetingDate: "asc" },
    take: 400,
  });

  const events: CalEvent[] = meetings.map((m) => ({
    id: m.id,
    title: m.deal?.company.name ? `${m.deal.company.name} × Layers` : m.title,
    date: (m.meetingDate ?? m.bookedDate).toISOString(),
    status: m.status,
    owner: m.ae?.name ?? null,
    dealId: m.dealId,
  }));

  return (
    <>
      <Topbar title="Calendar" sub="Meetings, demos & follow-ups — your week at a glance" />
      <CalendarView events={events} />
    </>
  );
}
