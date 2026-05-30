import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessSales, canAccessSupply, canAccessLogistics } from "@/lib/permissions";
import Sidebar from "@/components/Sidebar";
import Toaster from "@/components/Toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const salesCount = await prisma.deal.count({
    where: { stage: { notIn: ["Closed Won", "Closed Lost", "Disqualified"] } },
  });

  return (
    <div className="app">
      <Sidebar
        user={{ name: user.name, role: user.role, avatarUrl: user.avatarUrl }}
        salesCount={salesCount}
        access={{
          sales: canAccessSales(user.role),
          supply: canAccessSupply(user.role),
          logistics: canAccessLogistics(user.role),
        }}
      />
      <main className="main">{children}</main>
      <Toaster />
    </div>
  );
}
