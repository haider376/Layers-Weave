import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessLogistics, canSeeRaghouse } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import { RailPanel, RailLeaderboard } from "@/components/Rail";
import ShipmentTable, { type Shipment } from "./ShipmentTable";

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function LogisticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessLogistics(user.role)) redirect("/dashboard");

  const showRag = canSeeRaghouse(user.role);

  const fulfilments = await prisma.fulfilment.findMany({
    include: { quote: true, carrier: true, raghouse: true },
    orderBy: { expectedFulfilment: "asc" },
  });

  const numOrEmpty = (n: number | null) => (n == null ? "" : String(n));
  const shipments: Shipment[] = fulfilments.map((f) => ({
    id: f.id,
    quoteId: f.quote.quoteId,
    from: f.fromCity ?? "Pakistan",
    destination: f.destination ?? f.consigneeAddress ?? "—",
    carrier: f.carrier?.name ?? "—",
    orderType: f.orderType,
    totalUnits: f.totalUnits,
    orderStage: f.orderStage,
    statusNote: f.statusNote ?? "",
    eta: fmtDate(f.expectedFulfilment),
    // Pickup source — only included in the payload for roles allowed to see it.
    raghouse: showRag ? f.raghouse?.name ?? null : null,
    lastMileCourier: f.lastMileCourier ?? "",
    purchaseOrderUrl: f.purchaseOrderUrl ?? "",
    consigneeAddress: f.consigneeAddress ?? "",
    awbNo: f.awbNo ?? "",
    invoiceNo3pl: f.invoiceNo3pl ?? "",
    layersOrderId: f.layersOrderId ?? "",
    paymentStatus: f.paymentStatus ?? "",
    goodsDescription: f.goodsDescription ?? "",
    boxesBales: numOrEmpty(f.boxesBales),
    estimateWeight: numOrEmpty(f.estimateWeight),
    chargeableWeight: numOrEmpty(f.chargeableWeight),
    totalChargedAmount: numOrEmpty(f.totalChargedAmount),
    perKgAmount: numOrEmpty(f.perKgAmount),
    perKgPkr: numOrEmpty(f.perKgPkr),
    lmTid: f.lmTid ?? "",
  }));

  // Destination leaderboard — where shipments are heading.
  const destMap = new Map<string, number>();
  for (const f of fulfilments) {
    const country = (f.destination ?? f.consigneeAddress ?? "—").split(",").pop()?.trim() || "—";
    destMap.set(country, (destMap.get(country) ?? 0) + 1);
  }
  const destRows = [...destMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, n]) => ({ label, value: String(n), sub: "shipments", pct: n }));

  const carrierMap = new Map<string, number>();
  for (const f of fulfilments) { const c = f.carrier?.name ?? "—"; carrierMap.set(c, (carrierMap.get(c) ?? 0) + 1); }
  const carrierRows = [...carrierMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, n]) => ({ label, value: String(n), sub: "loads", pct: n }));

  return (
    <>
      <Topbar title="Logistics" sub="Door-to-door shipment tracking, Pakistan to client" />
      <div className="with-rail">
        <div style={{ minWidth: 0 }}>
          <section className="panel">
            <div className="panel-h">
              <h2>Active shipments</h2>
              <span className="count">Pakistan → global · freight auto-derived · click a row to edit</span>
            </div>
            <ShipmentTable shipments={shipments} />
          </section>
        </div>
        <aside className="rail">
          <RailPanel title="Top destinations" hint="by shipments"><RailLeaderboard rows={destRows} /></RailPanel>
          <RailPanel title="3PL split" hint="loads"><RailLeaderboard rows={carrierRows} /></RailPanel>
        </aside>
      </div>
    </>
  );
}
