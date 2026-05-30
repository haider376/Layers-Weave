import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";

function statusCls(s: string) {
  if (s === "Open Deal") return "go";
  if (s === "In Progress") return "work";
  if (s === "Cool Off" || s === "Data Quality") return "wait";
  if (s === "Do Not Contact") return "bad";
  return "work";
}

export default async function CompaniesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: true, _count: { select: { deals: true, contacts: true } } },
  });

  return (
    <>
      <Topbar title="Companies" sub={`${companies.length} accounts across your book of business`} />
      <section className="panel">
        <div className="panel-h"><h2>All companies</h2><span className="count">click a row to open</span></div>
        <table>
          <thead>
            <tr><th>Company</th><th>Owner</th><th>Tier</th><th>Lead status</th><th>Country</th><th>Deals</th><th>Contacts</th></tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr className="row" key={c.id}>
                <td>
                  <Link href={`/companies/${c.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>
                    {c.name}
                    <small style={{ display: "block", color: "var(--faint)", fontWeight: 500 }}>{c.clientId}</small>
                  </Link>
                </td>
                <td>{c.owner ? <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span className="mini-av">{initials(c.owner.name)}</span>{c.owner.name.split(" ")[0]}</span> : "—"}</td>
                <td><span className="grade">{c.tier ?? "—"}</span></td>
                <td><span className={`st ${statusCls(c.leadStatus)}`}><span className="d" />{c.leadStatus}</span></td>
                <td>{c.country ?? "—"}</td>
                <td>{c._count.deals}</td>
                <td>{c._count.contacts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
