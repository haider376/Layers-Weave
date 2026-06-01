import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";
import { RailPanel, RailLeaderboard } from "@/components/Rail";
import { type BoardDeal } from "./Board";
import DealsView from "./DealsView";

export default async function SalesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const [deals, meetings] = await Promise.all([
    prisma.deal.findMany({ include: { owner: true, company: true, quotes: { select: { quoteId: true } } }, orderBy: { createDate: "desc" } }),
    prisma.salesMeeting.findMany({ include: { bdr: true } }),
  ]);

  const data: BoardDeal[] = deals.map((d) => ({
    id: d.id,
    name: d.name.replace(/ × Layers$/, ""),
    amount: d.amount,
    stage: d.stage,
    ownerInitials: d.owner ? initials(d.owner.name) : "—",
    ownerName: d.owner?.name ?? "—",
    ownerAvatarUrl: d.owner?.avatarUrl ?? null,
    company: d.company.name,
    quoteId: d.quotes[0]?.quoteId ?? null,
  }));

  // name → avatar lookup for the rail leaderboards
  const avatarByName = new Map<string, string | null>();
  for (const d of deals) if (d.owner) avatarByName.set(d.owner.name, d.owner.avatarUrl);
  for (const m of meetings) if (m.bdr) avatarByName.set(m.bdr.name, m.bdr.avatarUrl);

  // AE leaderboard — deals won
  const aeWins = new Map<string, number>();
  for (const d of deals.filter((x) => x.stage === "Closed Won")) {
    if (d.owner) aeWins.set(d.owner.name, (aeWins.get(d.owner.name) ?? 0) + 1);
  }
  const aeRows = [...aeWins.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, n]) => ({ label, value: String(n), pct: n, sub: "deals won", avatarUrl: avatarByName.get(label) ?? null }));

  // BDR leaderboard — SQLs booked
  const bdrCount = new Map<string, number>();
  for (const m of meetings) { if (m.bdr) bdrCount.set(m.bdr.name, (bdrCount.get(m.bdr.name) ?? 0) + 1); }
  const bdrRows = [...bdrCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, n]) => ({ label, value: String(n), pct: n, sub: "SQLs booked", avatarUrl: avatarByName.get(label) ?? null }));

  return (
    <>
      <Topbar title="Deals" sub="Drag deals across your 8 stages — appointment to close" />
      <div className="with-rail">
        <div style={{ minWidth: 0 }}>
          <DealsView deals={data} />
        </div>
        <aside className="rail">
          <RailPanel title="AE leaderboard" hint="deals won"><RailLeaderboard rows={aeRows} avatars /></RailPanel>
          <RailPanel title="BDR leaderboard" hint="SQLs booked"><RailLeaderboard rows={bdrRows} avatars /></RailPanel>
        </aside>
      </div>
    </>
  );
}
