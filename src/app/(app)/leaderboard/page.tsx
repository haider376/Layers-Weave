import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import LeaderboardView, { type LbRow } from "./LeaderboardView";

const AE_ROLES = new Set(["AE", "AE/QA", "AE (Probation)"]);

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const [users, deals, meetings, calls] = await Promise.all([
    prisma.user.findMany(),
    prisma.deal.findMany({ include: { owner: true } }),
    prisma.salesMeeting.findMany({ include: { bdr: true } }),
    prisma.callLog.findMany({ take: 5000 }),
  ]);

  // AE board — ranked by won revenue
  const aeRows: LbRow[] = users.filter((u) => AE_ROLES.has(u.role)).map((u) => {
    const owned = deals.filter((d) => d.ownerId === u.id);
    const won = owned.filter((d) => d.stage === "Closed Won");
    const revenue = won.reduce((s, d) => s + d.amount, 0);
    const open = owned.filter((d) => !d.stage.startsWith("Closed") && d.stage !== "Disqualified");
    return { name: u.name, title: u.title, primary: revenue, primaryLabel: "won", wins: won.length, secondary: `${won.length} won · ${open.length} open · ${owned.length} deals` };
  }).sort((a, b) => b.primary - a.primary || b.wins - a.wins);

  // BDR board — ranked by SQLs booked
  const callsByAgent = new Map<string, number>();
  for (const c of calls) callsByAgent.set(c.agent ?? "", (callsByAgent.get(c.agent ?? "") ?? 0) + 1);
  const bdrRows: LbRow[] = users.filter((u) => u.role === "BDR" || u.role === "Lead Gen/CRM").map((u) => {
    const sqls = meetings.filter((m) => m.bdrId === u.id).length;
    const made = callsByAgent.get(u.name) ?? 0;
    return { name: u.name, title: u.title, primary: sqls, primaryLabel: "SQLs", wins: sqls, secondary: `${sqls} SQLs · ${made.toLocaleString("en-US")} calls` };
  }).sort((a, b) => b.primary - a.primary);

  return (
    <>
      <Topbar title="Leaderboard" sub="The floor, ranked. Close more. Move up. No excuses." />
      <LeaderboardView aeRows={aeRows} bdrRows={bdrRows} />
    </>
  );
}
