import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessLogistics } from "@/lib/permissions";
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

  const fulfilments = await prisma.fulfilment.findMany({
    include: { quote: true, carrier: true },
    orderBy: { expectedFulfilment: "asc" },
  });

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
