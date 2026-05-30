import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { getTimeline } from "@/lib/sales";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";
import ActivityPanel from "@/components/ActivityPanel";
import EditableDetails from "@/components/EditableDetails";
import RecordActions from "@/components/RecordActions";
import { updateContactAction } from "../../sales/record-actions";

export default async function ContactDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");
  const { id } = await params;

  const contact = await prisma.contact.findUnique({ where: { id }, include: { company: true, deals: true } });
  if (!contact) notFound();
  const events = await getTimeline({ contactId: id });

  return (
    <>
      <Topbar title={contact.name} sub={`${contact.title ?? "Contact"} · ${contact.company.name}`} />
      <div style={{ marginBottom: 12 }}>
        <Link href="/contacts" className="back-link">← Contacts</Link>
        <Link href={`/companies/${contact.companyId}`} className="back-link" style={{ marginLeft: 12 }}>↗ {contact.company.name}</Link>
      </div>

      <div className="record-3">
        <div className="rec-col">
          <section className="panel rec-id">
            <div className="rec-id-top">
              <div className="rec-id-av">{initials(contact.name)}</div>
              <div><div className="rec-id-nm">{contact.name}</div><div className="rec-id-sub">{contact.title ?? "Contact"}</div></div>
            </div>
            {contact.primary && <span className="st go" style={{ marginTop: 10 }}><span className="d" />Primary contact</span>}
            <RecordActions />
          </section>

          <section className="panel">
            <div className="panel-h"><h2>Key information</h2></div>
            <div style={{ padding: "10px 16px 16px" }}>
              <EditableDetails
                id={contact.id}
                action={updateContactAction}
                fields={[
                  { key: "name", label: "Name", value: contact.name },
                  { key: "title", label: "Title", value: contact.title ?? "" },
                  { key: "email", label: "Email", value: contact.email ?? "" },
                  { key: "phone", label: "Phone", value: contact.phone ?? "" },
                ]}
              />
              <div className="kv-static">
                <div><span>Company</span><b>{contact.company.name}</b></div>
              </div>
            </div>
          </section>
        </div>

        <div className="rec-col">
          <ActivityPanel companyId={contact.companyId} events={events.map((e) => ({ ...e, at: e.at.toISOString() }))} contact={{ id: contact.id, name: contact.name, email: contact.email, phone: contact.phone }} />
        </div>

        <div className="rec-col">
          <section className="panel">
            <div className="panel-h"><h2>Deals</h2><span className="count">{contact.deals.length}</span></div>
            <div style={{ padding: "6px 0" }}>
              {contact.deals.map((d) => (
                <Link href={`/deals/${d.id}`} key={d.id} className="mini-row">
                  <span style={{ flex: 1 }}>{d.name.replace(/ × Layers$/, "")}<small>{d.stage}</small></span>
                  <span style={{ color: "var(--neon)", fontWeight: 700, fontSize: 12 }}>${d.amount.toLocaleString("en-US")}</span>
                </Link>
              ))}
              {contact.deals.length === 0 && <div className="q-note" style={{ padding: 16 }}>No deals linked.</div>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
