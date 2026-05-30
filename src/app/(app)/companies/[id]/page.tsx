import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales, canReassignOwner } from "@/lib/permissions";
import { getTimeline } from "@/lib/sales";
import Topbar from "@/components/Topbar";
import ActivityPanel from "@/components/ActivityPanel";
import EditableDetails from "@/components/EditableDetails";
import RecordActions from "@/components/RecordActions";
import OwnerSelect from "./OwnerSelect";
import AddContact from "./AddContact";
import { updateCompanyAction } from "../../sales/record-actions";

const LEAD_STATUSES = ["New", "In Progress", "Open Deal", "Cool Off", "Data Quality", "Do Not Contact"];
const TYPES = ["Retailer", "Wholesaler", "Reseller"];
const TIERS = ["A", "B", "C"];

function statusCls(s: string) {
  if (s === "Open Deal") return "go";
  if (s === "Do Not Contact") return "bad";
  if (s === "Cool Off" || s === "Data Quality") return "wait";
  return "work";
}

export default async function CompanyDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: { owner: true, bdr: true, contacts: true, deals: { include: { contact: true }, orderBy: { createDate: "desc" } } },
  });
  if (!company) notFound();

  const canReassign = canReassignOwner(user.role);
  const reps = canReassign ? (await prisma.user.findMany({ orderBy: { name: "asc" } })).map((u) => ({ id: u.id, name: u.name })) : [];

  const events = await getTimeline({ companyId: id });
  const primary = company.contacts.find((c) => c.primary) ?? company.contacts[0] ?? null;

  return (
    <>
      <Topbar title={company.name} sub={`${company.clientId} · ${company.type ?? "Account"}`} />
      <div style={{ marginBottom: 12 }}>
        <Link href="/companies" className="back-link">← Companies</Link>
        <Link href={`/deals/new?company=${company.id}`} className="addq" style={{ marginLeft: 12 }}>+ New deal</Link>
      </div>

      <div className="record-3">
        {/* LEFT — identity + key info */}
        <div className="rec-col">
          <section className="panel rec-id">
            <div className="rec-id-top">
              <div className="rec-id-av">🏢</div>
              <div><div className="rec-id-nm">{company.name}</div><div className="rec-id-sub">{company.country ?? "—"}</div></div>
            </div>
            <span className={`st ${statusCls(company.leadStatus)}`} style={{ marginTop: 10 }}><span className="d" />{company.leadStatus}</span>
            <RecordActions />
          </section>

          <section className="panel">
            <div className="panel-h"><h2>Key information</h2></div>
            <div style={{ padding: "10px 16px 16px" }}>
              <EditableDetails
                id={company.id}
                action={updateCompanyAction}
                fields={[
                  { key: "leadStatus", label: "Lead status", value: company.leadStatus, type: "select", options: LEAD_STATUSES },
                  { key: "type", label: "Type", value: company.type ?? "Wholesaler", type: "select", options: TYPES },
                  { key: "tier", label: "Tier", value: company.tier ?? "B", type: "select", options: TIERS },
                  { key: "domain", label: "Domain", value: company.domain ?? "" },
                  { key: "email", label: "Email", value: company.email ?? "" },
                  { key: "phone", label: "Phone", value: company.phone ?? "" },
                  { key: "country", label: "Country", value: company.country ?? "" },
                  { key: "aiNotes", label: "AI notes", value: company.aiNotes ?? "", type: "textarea" },
                ]}
              />
              <div className="kv-static">
                <div><span>Owner (AE)</span>{canReassign ? <OwnerSelect companyId={company.id} field="ownerId" value={company.ownerId ?? ""} users={reps} /> : <b>{company.owner?.name ?? "—"}</b>}</div>
                <div><span>BDR owner</span>{canReassign ? <OwnerSelect companyId={company.id} field="bdrId" value={company.bdrId ?? ""} users={reps} /> : <b>{company.bdr?.name ?? "—"}</b>}</div>
                <div><span>Record ID</span><b>{company.clientId}</b></div>
              </div>
            </div>
          </section>
        </div>

        {/* CENTER — activity */}
        <div className="rec-col">
          <ActivityPanel companyId={company.id} events={events.map((e) => ({ ...e, at: e.at.toISOString() }))} contact={primary} />
        </div>

        {/* RIGHT — associations */}
        <div className="rec-col">
          <section className="panel">
            <div className="panel-h"><h2>Contacts</h2><span className="count">{company.contacts.length}</span></div>
            <div style={{ padding: "6px 0" }}>
              {company.contacts.map((c) => (
                <Link href={`?contact=${c.id}`} key={c.id} className="mini-row">
                  <span className="mini-av">{c.name.slice(0, 2).toUpperCase()}</span>
                  <span style={{ flex: 1 }}>{c.name}<small>{c.title ?? ""}{c.primary ? " · primary" : ""}</small></span>
                </Link>
              ))}
              <AddContact companyId={company.id} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-h"><h2>Deals</h2><span className="count">{company.deals.length}</span></div>
            <div style={{ padding: "6px 0" }}>
              {company.deals.map((d) => (
                <Link href={`?deal=${d.id}`} key={d.id} className="mini-row">
                  <span style={{ flex: 1 }}>{d.name.replace(/ × Layers$/, "")}<small>{d.stage}</small></span>
                  <span style={{ color: "var(--neon)", fontWeight: 700, fontSize: 12 }}>${d.amount.toLocaleString("en-US")}</span>
                </Link>
              ))}
              {company.deals.length === 0 && <div className="q-note" style={{ padding: 16 }}>No deals yet.</div>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
