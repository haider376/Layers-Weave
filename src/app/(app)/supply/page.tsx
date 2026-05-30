import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSupply, canSeeRaghouse, canSeeMargin } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import { RailPanel, RailLeaderboard } from "@/components/Rail";
import SupplyView, { type SupplyQuote } from "./SupplyView";

export default async function SupplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSupply(user.role)) redirect("/dashboard");

  const showRag = canSeeRaghouse(user.role);
  const showMargin = canSeeMargin(user.role);
  const handpickOnly = user.role === "Womenswear";

  const [quotesRaw, raghouses] = await Promise.all([
    prisma.quote.findMany({
      orderBy: { dateStarted: "desc" },
      include: { items: { orderBy: { position: "asc" } }, raghouse: true, bulkDetail: true },
    }),
    prisma.raghouse.findMany({ where: { active: true }, orderBy: { reliability: "desc" } }),
  ]);

  // Resilient: if the SourcingResponse table isn't migrated yet on a deployment,
  // don't blank the whole page — just show no answered demand.
  let sourcedRaw: Awaited<ReturnType<typeof prisma.sourcingResponse.findMany>> = [];
  try {
    sourcedRaw = await prisma.sourcingResponse.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  } catch {
    sourcedRaw = [];
  }

  const responses = sourcedRaw.map((r) => ({
    id: r.id, itemName: r.itemName, quoteRefs: r.quoteRefs, totalQty: r.totalQty, availabilityQty: r.availabilityQty,
    buyingPricePerItem: showMargin ? r.buyingPricePerItem : null,
    grade: r.grade, mixSpecs: r.mixSpecs, salesMessage: r.salesMessage, status: r.status,
    createdBy: r.createdBy, createdAt: r.createdAt.toISOString(),
  }));

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

  // Top demand — items requested across the most distinct clients/quotes.
  const dem = new Map<string, { name: string; quotes: Set<string>; qty: number }>();
  for (const q of quotesRaw) {
    if (handpickOnly && q.type !== "Handpick") continue;
    for (const it of q.items) {
      const key = (it.item || "").trim().toLowerCase();
      if (!key || !it.quantity) continue;
      const cur = dem.get(key) ?? { name: it.item.trim(), quotes: new Set(), qty: 0 };
      cur.quotes.add(q.quoteId); cur.qty += it.quantity;
      dem.set(key, cur);
    }
  }
  const demandRows = [...dem.values()].sort((a, b) => b.quotes.size - a.quotes.size || b.qty - a.qty).slice(0, 6)
    .map((d) => ({ label: d.name, value: `${d.quotes.size}`, sub: `${d.qty.toLocaleString("en-US")} pcs`, pct: d.quotes.size }));

  const supplierRows = raghouses.slice(0, 6).map((r) => ({ label: r.name, value: `${r.reliability ?? 0}`, sub: r.region ?? "", pct: r.reliability ?? 0 }));

  return (
    <>
      <Topbar title="Supply" sub="Bulk & handpick quotes — tracked by Quote ID, never client name" />
      <div className="with-rail">
        <div style={{ minWidth: 0 }}>
          <SupplyView
            quotes={quotes}
            raghouses={raghouses.map((r) => ({ id: r.id, name: r.name }))}
            canRag={showRag}
            canMargin={showMargin}
            roleName={user.name.split(" ")[0]}
            handpickOnlyDemand={handpickOnly}
            responses={responses}
          />
        </div>
        <aside className="rail">
          <RailPanel title="Top demand" hint="clients asking"><RailLeaderboard rows={demandRows} /></RailPanel>
          {showRag && <RailPanel title="Supplier ranking" hint="reliability"><RailLeaderboard rows={supplierRows} /></RailPanel>}
        </aside>
      </div>
    </>
  );
}
