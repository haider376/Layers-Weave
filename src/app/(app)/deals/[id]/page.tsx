import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { getTimeline } from "@/lib/sales";
import Topbar from "@/components/Topbar";
import ActivityPanel from "@/components/ActivityPanel";
import DealEditor from "./DealEditor";

export default async function DealDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      company: { include: { contacts: true } },
      contact: true,
      owner: true,
      quotes: { include: { bulkDetail: true, fulfilment: { include: { carrier: true } }, items: true } },
    },
  });
  if (!deal) notFound();

  function fmt(d: Date | null | undefined) { return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"; }

  const events = await getTimeline({ dealId: id });

  return (
    <>
      <Topbar title={deal.name.replace(/ × Layers$/, "")} sub={`${deal.dealId} · ${deal.stage} · ${deal.company.name}`} />
      <div style={{ marginBottom: 14 }}>
        <Link href="/sales" className="back-link">← Pipeline</Link>
        <Link href={`/companies/${deal.companyId}`} className="back-link" style={{ marginLeft: 12 }}>↗ {deal.company.name}</Link>
        <Link href="/calculator" className="addq" style={{ marginLeft: 12 }}>Open calculator</Link>
      </div>

      <div className="record-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="panel">
            <div className="panel-h"><h2>Deal</h2><span className="count">{deal.dealId}</span></div>
            <div style={{ padding: "8px 16px 16px" }}>
              <DealEditor
                dealId={deal.id}
                name={deal.name.replace(/ × Layers$/, "")}
                amount={deal.amount}
                stage={deal.stage}
                requestType={deal.requestType ?? ""}
                contactId={deal.contactId ?? ""}
                contacts={deal.company.contacts.map((c) => ({ id: c.id, name: c.name }))}
              />
            </div>
          </section>
          {deal.quotes.length > 0 && (
            <section className="panel">
              <div className="panel-h"><h2>Supply &amp; Logistics status</h2><span className="count">for your client updates</span></div>
              <div style={{ padding: "8px 0" }}>
                {deal.quotes.map((q) => {
                  const units = q.items.reduce((s, i) => s + i.quantity, 0);
                  const f = q.fulfilment;
                  return (
                    <div key={q.id} className="order-status">
                      <div className="os-head">
                        <span className="q-id">{q.quoteId}</span>
                        <span className="q-type">{q.type}</span>
                        {q.bulkDetail?.grade && <span className="grade">Grade {q.bulkDetail.grade}</span>}
                        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)" }}>{units.toLocaleString("en-US")} units</span>
                      </div>
                      <div className="os-track">
                        <div className="os-step"><span className="os-k">Supply</span><span className={`st ${q.status === "Delivered" || q.status === "Closed/Won" ? "go" : "work"}`}><span className="d" />{q.status}</span></div>
                        <div className="os-step"><span className="os-k">Freight</span><span className="grade">{f?.orderType ?? "—"}</span></div>
                        <div className="os-step"><span className="os-k">Logistics</span>{f ? <span className={`st ${f.orderStage === "Delivered" ? "go" : "work"}`}><span className="d" />{f.orderStage}</span> : <span style={{ color: "var(--faint)", fontSize: 11 }}>not started</span>}</div>
                        <div className="os-step"><span className="os-k">ETA</span><span style={{ fontSize: 11.5, fontWeight: 600 }}>{fmt(f?.expectedFulfilment)}</span></div>
                        <div className="os-step"><span className="os-k">Carrier</span><span style={{ fontSize: 11.5 }}>{f?.carrier?.name ?? "—"}</span></div>
                        <div className="os-step"><span className="os-k">Destination</span><span style={{ fontSize: 11.5 }}>{f?.destination ?? "—"}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <ActivityPanel
          companyId={deal.companyId}
          dealId={deal.id}
          events={events.map((e) => ({ ...e, at: e.at.toISOString() }))}
          contact={deal.contact ? { id: deal.contact.id, name: deal.contact.name, email: deal.contact.email, phone: deal.contact.phone } : null}
        />
      </div>
    </>
  );
}
