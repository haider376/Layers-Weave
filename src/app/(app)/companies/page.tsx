import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import LeadsView, { type Lead } from "./LeadsView";

export default async function LeadsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const [companies, cadences] = await Promise.all([
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: { owner: true, bdr: true, _count: { select: { deals: true, contacts: true } } },
    }),
    safe(prisma.cadence.findMany({ where: { active: true }, select: { id: true, name: true, function: true }, orderBy: { updatedAt: "desc" } }), []),
  ]);

  const leads: Lead[] = companies.map((c) => ({
    id: c.id, name: c.name, clientId: c.clientId,
    owner: c.owner?.name ?? "—", bdr: c.bdr?.name ?? "—",
    leadStatus: c.leadStatus, country: c.country ?? "—", tier: c.tier ?? "—", type: c.type ?? "—",
    createdAt: c.createdAt.toISOString(),
    lastActivity: c.lastContacted ? c.lastContacted.toISOString() : null,
    ownerAssignedAt: c.ownerAssignedAt ? c.ownerAssignedAt.toISOString() : null,
    deals: c._count.deals, contacts: c._count.contacts,
  }));

  return (
    <>
      <Topbar title="Leads" sub={`${leads.length} accounts — filter, sort, import & export`} />
      <LeadsView leads={leads} cadences={cadences} />
    </>
  );
}
