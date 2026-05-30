import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { getTimeline } from "@/lib/sales";
import Topbar from "@/components/Topbar";
import ActivityPanel from "@/components/ActivityPanel";
import EditableDetails from "@/components/EditableDetails";
import AddContact from "./AddContact";
import { updateCompanyAction } from "../../sales/record-actions";

const LEAD_STATUSES = ["New", "In Progress", "Open Deal", "Cool Off", "Data Quality", "Do Not Contact"];
const TYPES = ["Retailer", "Wholesaler", "Reseller"];
const TIERS = ["A", "B", "C"];

export default async function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      owner: true,
      contacts: true,
      deals: { include: { contact: true }, orderBy: { createDate: "desc" } },
    },
  });
  if (!company) notFound();

  const events = await getTimeline({ companyId: id });
  const primary = company.contacts.find((c) => c.primary) ?? company.contacts[0] ?? null;

  return (
    <>
      <Topbar title={company.name} sub={`${company.clientId} · ${company.type ?? "Account"} · owner ${company.owner?.name ?? "—"}`} />
      <div style={{ marginBottom: 14 }}>
        <Link href="/companies" className="back-link">← Companies</Link>
        <Link href={`/deals/new?company=${company.id}`} className="addq" style={{ marginLeft: 12 }}>+ New deal</Link>
      </div>

      <div className="record-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section className="panel">
            <div className="panel-h"><h2>Details</h2></div>
            <div style={{ padding: "8px 16px 16px" }}>
              <EditableDetails
                id={company.id}
                action={updateCompanyAction}
                fields={[
                  { key: "name", label: "Name", value: company.name },
                  { key: "domain", label: "Domain", value: company.domain ?? "" },
                  { key: "type", label: "Type", value: company.type ?? "Wholesaler", type: "select", options: TYPES },
                  { key: "tier", label: "Tier", value: company.tier ?? "B", type: "select", options: TIERS },
                  { key: "leadStatus", label: "Lead status", value: company.leadStatus, type: "select", options: LEAD_STATUSES },
                  { key: "country", label: "Country", value: company.country ?? "" },
                  { key: "phone", label: "Phone", value: company.phone ?? "" },
                  { key: "email", label: "Email", value: company.email ?? "" },
                  { key: "aiNotes", label: "Notes", value: company.aiNotes ?? "", type: "textarea" },
                ]}
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel-h"><h2>Contacts</h2><span className="count">{company.contacts.length}</span></div>
            <div style={{ padding: "6px 0" }}>
              {company.contacts.map((c) => (
                <Link href={`/contacts/${c.id}`} key={c.id} className="mini-row">
                  <span className="mini-av">{c.name.slice(0, 2).toUpperCase()}</span>
                  <span style={{ flex: 1 }}>{c.name}<small>{c.title ?? ""} {c.primary ? "· primary" : ""}</small></span>
                  <span style={{ fontSize: 11, color: "var(--faint)" }}>{c.email ?? ""}</span>
                </Link>
              ))}
              <AddContact companyId={company.id} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-h"><h2>Deals</h2><span className="count">{company.deals.length}</span></div>
            <div style={{ padding: "6px 0" }}>
              {company.deals.map((d) => (
                <Link href={`/deals/${d.id}`} key={d.id} className="mini-row">
                  <span style={{ flex: 1 }}>{d.name.replace(/ × Layers$/, "")}<small>{d.stage}</small></span>
                  <span className="amt" style={{ color: "var(--neon)", fontWeight: 700, fontSize: 12 }}>${d.amount.toLocaleString("en-US")}</span>
                </Link>
              ))}
              {company.deals.length === 0 && <div className="q-note" style={{ padding: 16 }}>No deals yet.</div>}
            </div>
          </section>
        </div>

        <ActivityPanel companyId={company.id} events={events.map((e) => ({ ...e, at: e.at.toISOString() }))} contact={primary} />
      </div>
    </>
  );
}
