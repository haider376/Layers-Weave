import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";
import Board, { type BoardDeal } from "./Board";

export default async function SalesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const deals = await prisma.deal.findMany({
    include: { owner: true, quotes: { select: { quoteId: true } } },
    orderBy: { createDate: "desc" },
  });

  const data: BoardDeal[] = deals.map((d) => ({
    id: d.id,
    name: d.name.replace(/ × Layers$/, ""),
    amount: d.amount,
    stage: d.stage,
    ownerInitials: d.owner ? initials(d.owner.name) : "—",
    quoteId: d.quotes[0]?.quoteId ?? null,
  }));

  return (
    <>
      <Topbar title="Sales Pipeline" sub="Deals from appointment to close — your 8 HubSpot stages" />
      <Board deals={data} />
    </>
  );
}
