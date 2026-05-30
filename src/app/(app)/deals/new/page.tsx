import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import NewDealForm from "./NewDealForm";

export default async function NewDealPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");
  const { company } = await searchParams;

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: { contacts: true },
    take: 500,
  });

  return (
    <>
      <Topbar title="New deal" sub="Create a deal and associate it with a company and contact" />
      <NewDealForm
        preselect={company ?? ""}
        companies={companies.map((c) => ({ id: c.id, name: c.name, contacts: c.contacts.map((ct) => ({ id: ct.id, name: ct.name })) }))}
      />
    </>
  );
}
