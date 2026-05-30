import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessLogistics, canSeeRaghouse } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
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

  return (
    <>
      <Topbar title="Logistics" sub="Door-to-door shipment tracking, Pakistan to client" />
      <section className="panel">
        <div className="panel-h">
          <h2>Active shipments</h2>
          <span className="count">Pakistan → global · freight auto-derived from quantity</span>
        </div>
        <ShipmentTable shipments={shipments} />
      </section>
    </>
  );
}
