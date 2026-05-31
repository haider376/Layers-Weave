import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import PeopleView, { type Person } from "./PeopleView";

export default async function PeoplePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const [contacts, cadences] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { name: "asc" },
      include: { company: { include: { owner: true } } },
      take: 1000,
    }),
    safe(prisma.cadence.findMany({ where: { active: true }, select: { id: true, name: true, function: true }, orderBy: { updatedAt: "desc" } }), []),
  ]);

  const people: Person[] = contacts.map((c) => ({
    id: c.id, name: c.name, title: c.title ?? "—", email: c.email ?? "—", phone: c.phone ?? "—",
    primary: c.primary, company: c.company.name, companyId: c.companyId,
    owner: c.company.owner?.name ?? "—", leadStatus: c.company.leadStatus,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <>
      <Topbar title="People" sub={`${people.length} contacts — filter, sort, import & export`} />
      <PeopleView people={people} cadences={cadences} />
    </>
  );
}
