import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessSales, canAccessSupply, canAccessLogistics, VIEWABLE_ROLES, ROLE_LABEL } from "@/lib/permissions";
import Sidebar from "@/components/Sidebar";
import Toaster from "@/components/Toast";
import Celebration from "@/components/Celebration";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const salesCount = await prisma.deal.count({
    where: { stage: { notIn: ["Closed Won", "Closed Lost", "Disqualified"] } },
  });

  return (
    <div className="app">
      <Sidebar
        user={{
          name: user.name,
          role: user.role,
          realRole: user.realRole,
          isAdmin: user.isAdmin,
          viewingAs: user.viewingAs,
          avatarUrl: user.avatarUrl,
        }}
        salesCount={salesCount}
        access={{
          sales: canAccessSales(user.role),
          supply: canAccessSupply(user.role),
          logistics: canAccessLogistics(user.role),
        }}
        viewableRoles={VIEWABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
      />
      <main className="main">
        {user.viewingAs && (
          <div className="viewas-banner">
            👁 Viewing as <b>{ROLE_LABEL[user.viewingAs as keyof typeof ROLE_LABEL] ?? user.viewingAs}</b> — this is a preview of what they see.
          </div>
        )}
        {children}
      </main>
      <Toaster />
      <Celebration />
    </div>
  );
}
