import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import { RailPanel, RailLeaderboard } from "@/components/Rail";
import { salesLeaderboards } from "@/lib/sales";

export default async function ContactsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const [contacts, lb] = await Promise.all([
    prisma.contact.findMany({ orderBy: { name: "asc" }, include: { company: true }, take: 500 }),
    salesLeaderboards(),
  ]);

  return (
    <>
      <Topbar title="Contacts" sub={`${contacts.length} people across your accounts`} />
      <div className="with-rail">
       <div style={{ minWidth: 0 }}>
      <section className="panel">
        <div className="panel-h"><h2>All contacts</h2><span className="count">click a row to open</span></div>
        <table>
          <thead><tr><th>Name</th><th>Title</th><th>Company</th><th>Email</th><th>Phone</th></tr></thead>
          <tbody>
            {contacts.map((c) => (
              <tr className="row" key={c.id}>
                <td>
                  <Link href={`/contacts/${c.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>
                    <span className="mini-av" style={{ marginRight: 8 }}>{c.name.slice(0, 2).toUpperCase()}</span>
                    {c.name}{c.primary ? <span className="q-type" style={{ marginLeft: 8 }}>PRIMARY</span> : null}
                  </Link>
                </td>
                <td>{c.title ?? "—"}</td>
                <td><Link href={`/companies/${c.companyId}`} style={{ color: "var(--violet-br)", textDecoration: "none" }}>{c.company.name}</Link></td>
                <td>{c.email ?? "—"}</td>
                <td>{c.phone ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
       </div>
       <aside className="rail">
         <RailPanel title="AE leaderboard" hint="deals won"><RailLeaderboard rows={lb.aeRows} avatars /></RailPanel>
         <RailPanel title="BDR leaderboard" hint="SQLs booked"><RailLeaderboard rows={lb.bdrRows} avatars /></RailPanel>
       </aside>
      </div>
    </>
  );
}
