import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Sidebar from "@/components/Sidebar";
import Toaster from "@/components/Toast";
import Celebration from "@/components/Celebration";
import PageTransition from "@/components/PageTransition";
import DealDrawer from "@/components/DealDrawer";
import PreferencesInit from "@/components/PreferencesInit";
import { Suspense } from "react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const salesCount = await prisma.deal.count({
    where: { stage: { notIn: ["Closed Won", "Closed Lost", "Disqualified"] } },
  });

  return (
    <div className="app">
      <Sidebar
        user={{ name: user.name, avatarUrl: user.avatarUrl }}
        salesCount={salesCount}
      />
      <main className="main">
        <PageTransition>{children}</PageTransition>
      </main>
      <Toaster />
      <Celebration />
      <Suspense fallback={null}><DealDrawer /></Suspense>
      <PreferencesInit />
    </div>
  );
}
