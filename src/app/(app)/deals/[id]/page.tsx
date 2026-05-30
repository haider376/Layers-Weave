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
    include: { company: { include: { contacts: true } }, contact: true, owner: true, quotes: true },
  });
  if (!deal) notFound();

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
              <div className="panel-h"><h2>Quotes</h2></div>
              <div style={{ padding: "6px 0" }}>
                {deal.quotes.map((q) => (
                  <div className="mini-row" key={q.id}>
                    <span className="q-id">{q.quoteId}</span>
                    <span style={{ flex: 1, marginLeft: 8 }}>{q.type}<small>{q.status}</small></span>
                  </div>
                ))}
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
