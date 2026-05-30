import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSupply } from "@/lib/permissions";
import Topbar from "@/components/Topbar";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { q = "" } = await searchParams;
  const term = q.trim();
  const showSupply = canAccessSupply(user.role);

  const [companies, contacts, deals, quotes] = term
    ? await Promise.all([
        prisma.company.findMany({ where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { clientId: { contains: term, mode: "insensitive" } }, { country: { contains: term, mode: "insensitive" } }] }, take: 20 }),
        prisma.contact.findMany({ where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }] }, include: { company: true }, take: 20 }),
        prisma.deal.findMany({ where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { dealId: { contains: term, mode: "insensitive" } }, { stage: { contains: term, mode: "insensitive" } }] }, include: { company: true }, take: 20 }),
        prisma.quote.findMany({ where: { OR: [{ quoteId: { contains: term, mode: "insensitive" } }, { clientName: { contains: term, mode: "insensitive" } }] }, take: 20 }),
      ])
    : [[], [], [], []];

  const total = companies.length + contacts.length + deals.length + quotes.length;

  return (
    <>
      <Topbar title="Search" sub={term ? `${total} results for “${term}”` : "Search across companies, contacts, deals and quotes"} />
      {!term && <div className="q-note" style={{ padding: 20 }}>Type a client, contact, deal or quote ID in the search bar.</div>}

      {term && total === 0 && <div className="q-note" style={{ padding: 20 }}>No matches for “{term}”.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {companies.length > 0 && (
          <Sec title="Companies" count={companies.length}>
            {companies.map((c) => <Row key={c.id} href={`/companies/${c.id}`} main={c.name} sub={`${c.clientId} · ${c.country ?? ""}`} tag={c.leadStatus} />)}
          </Sec>
        )}
        {contacts.length > 0 && (
          <Sec title="Contacts" count={contacts.length}>
            {contacts.map((c) => <Row key={c.id} href={`/contacts/${c.id}`} main={c.name} sub={`${c.title ?? ""} · ${c.company.name}`} tag={c.email ?? undefined} />)}
          </Sec>
        )}
        {deals.length > 0 && (
          <Sec title="Deals" count={deals.length}>
            {deals.map((d) => <Row key={d.id} href={`?deal=${d.id}`} main={d.name.replace(/ × Layers$/, "")} sub={`${d.dealId} · ${d.company.name}`} tag={d.stage} />)}
          </Sec>
        )}
        {quotes.length > 0 && (
          <Sec title="Quotes" count={quotes.length}>
            {quotes.map((qq) => <Row key={qq.id} href={`?deal=${qq.dealId ?? ""}`} main={qq.quoteId} sub={`${qq.clientName} · ${qq.type}`} tag={qq.status} />)}
          </Sec>
        )}
      </div>
    </>
  );
}

function Sec({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-h"><h2>{title}</h2><span className="count">{count}</span></div>
      <div style={{ padding: "4px 0" }}>{children}</div>
    </section>
  );
}
function Row({ href, main, sub, tag }: { href: string; main: string; sub: string; tag?: string }) {
  return (
    <Link href={href} className="mini-row">
      <span style={{ flex: 1, fontWeight: 600 }}>{main}<small>{sub}</small></span>
      {tag && <span className="st work"><span className="d" />{tag}</span>}
    </Link>
  );
}
