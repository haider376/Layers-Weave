import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSupply, canSeeRaghouse, canSeeMargin } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import SupplyView, { type SupplyQuote } from "./SupplyView";

export default async function SupplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // AEs / BDRs cannot reach the supply module at all (route guard).
  if (!canAccessSupply(user.role)) redirect("/dashboard");

  const showRag = canSeeRaghouse(user.role);
  const showMargin = canSeeMargin(user.role);

  const [quotesRaw, raghouses] = await Promise.all([
    prisma.quote.findMany({
      orderBy: { dateStarted: "desc" },
      include: { items: { orderBy: { position: "asc" } }, raghouse: true, bulkDetail: true },
    }),
    prisma.raghouse.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  // Strip margin/raghouse from the payload entirely when the role can't see them.
  const quotes: SupplyQuote[] = quotesRaw.map((q) => ({
    quoteId: q.quoteId,
    clientName: q.clientName,
    type: q.type,
    status: q.status,
    priority: q.priority,
    grade: q.bulkDetail?.grade ?? "A",
    raghouseId: showRag ? q.raghouseId : null,
    sellingPriceTotal: q.sellingPriceTotal,
    buyingPriceTotal: showMargin ? q.buyingPriceTotal : null,
    items: q.items.map((i) => ({ id: i.id, item: i.item, quantity: i.quantity, targetPrice: i.targetPrice })),
  }));

  return (
    <>
      <Topbar title="Supply" sub="Bulk & handpick quotes — tracked by Quote ID, never client name" />
      <SupplyView
        quotes={quotes}
        raghouses={raghouses.map((r) => ({ id: r.id, name: r.name }))}
        canRag={showRag}
        canMargin={showMargin}
        roleName={user.name.split(" ")[0]}
      />
    </>
  );
}
