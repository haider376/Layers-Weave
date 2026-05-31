import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import { stepDueDate, dueBucket } from "@/lib/cadences";
import CadenceBuilder from "./CadenceBuilder";

export default async function CadenceDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");
  const { id } = await params;

  const cadence = await safe(prisma.cadence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { position: "asc" } },
      members: { include: { contact: { include: { company: true } }, assignee: true }, orderBy: { enrolledAt: "desc" } },
      owner: true,
    },
  }), null);
  if (!cadence) notFound();

  const people = cadence.members.map((m) => {
    const step = cadence.steps.find((s) => s.day === m.currentDay) ?? cadence.steps.find((s) => s.day >= m.currentDay);
    const due = step ? stepDueDate(m.startedAt, step.day) : null;
    return {
      membershipId: m.id, name: m.contact.name, company: m.contact.company?.name ?? "—",
      title: m.contact.title ?? "", status: m.status,
      step: step ? `Day ${step.day}` : "Done", due: due ? due.toISOString() : null,
      bucket: due ? dueBucket(due) : "later", assignee: m.assignee?.name ?? "—", contactId: m.contactId,
    };
  });

  return (
    <>
      <Topbar title={cadence.name} sub={`${cadence.function} cadence · ${cadence.steps.length} steps · ${cadence.members.filter((m) => m.status === "active").length} active`} />
      <div style={{ marginBottom: 12 }}>
        <Link href="/cadences" className="back-link">← Cadences</Link>
      </div>
      <CadenceBuilder
        cadence={{ id: cadence.id, name: cadence.name, function: cadence.function, priority: cadence.priority, active: cadence.active }}
        steps={cadence.steps.map((s) => ({ id: s.id, day: s.day, type: s.type, subject: s.subject }))}
        people={people}
      />
    </>
  );
}
