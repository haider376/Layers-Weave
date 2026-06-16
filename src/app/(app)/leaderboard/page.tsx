import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import Topbar from "@/components/Topbar";
import LeaderboardView, { type LbRow } from "./LeaderboardView";

// Fixed roster (by first name) per the team spec.
const AE_FIRST = ["haider", "zikriya", "rija", "asjad", "adan", "kamila"];
const BDR_FIRST = ["fatima", "huzaifa", "hayaa"];
const first = (name: string) => name.split(" ")[0].toLowerCase();

export default async function LeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessSales(user.role)) redirect("/dashboard");

  const [users, deals, meetings, calls] = await Promise.all([
    prisma.user.findMany(),
    prisma.deal.findMany({ include: { owner: true } }),
    prisma.salesMeeting.findMany({ include: { bdr: true } }),
    safe(prisma.callLog.findMany({ take: 5000 }), []),
  ]);

  const callsByAgent = new Map<string, number>();
  const connectsByAgent = new Map<string, number>();
  const sqlCallsByAgent = new Map<string, number>();
  for (const c of calls) {
    const a = c.agent ?? "";
    callsByAgent.set(a, (callsByAgent.get(a) ?? 0) + 1);
    if (c.connected) connectsByAgent.set(a, (connectsByAgent.get(a) ?? 0) + 1);
    if (c.outcome === "SQL Booked") sqlCallsByAgent.set(a, (sqlCallsByAgent.get(a) ?? 0) + 1);
  }

  // AE board — ranked by won revenue
  const aeRows: LbRow[] = users.filter((u) => AE_FIRST.includes(first(u.name))).map((u) => {
    const owned = deals.filter((d) => d.ownerId === u.id);
    const won = owned.filter((d) => d.stage === "Closed Won");
    const revenue = won.reduce((s, d) => s + d.amount, 0);
    const open = owned.filter((d) => !d.stage.startsWith("Closed") && d.stage !== "Disqualified");
    const closed = owned.filter((d) => d.stage.startsWith("Closed")).length;
    const winRate = closed ? Math.round((won.length / closed) * 100) : 0;
    return { name: u.name, title: u.title, avatarUrl: u.avatarUrl, primary: revenue, primaryLabel: "won", wins: won.length,
      secondary: `${won.length} won · ${open.length} open · ${winRate}% win rate` };
  }).sort((a, b) => b.primary - a.primary || b.wins - a.wins);

  // BDR board — ranked by SQLs booked (Fatima + Huzaifa only)
  const bdrRows: LbRow[] = users.filter((u) => BDR_FIRST.includes(first(u.name))).map((u) => {
    const sqls = meetings.filter((m) => m.bdrId === u.id).length;
    const made = callsByAgent.get(u.name) ?? 0;
    const conn = connectsByAgent.get(u.name) ?? 0;
    const connRate = made ? Math.round((conn / made) * 100) : 0;
    return { name: u.name, title: u.title, avatarUrl: u.avatarUrl, primary: sqls, primaryLabel: "SQLs", wins: sqls,
      secondary: `${sqls} SQLs · ${made.toLocaleString("en-US")} calls · ${connRate}% connect` };
  }).sort((a, b) => b.primary - a.primary);

  return (
    <>
      <Topbar title="AE BDR Leaderboard" sub="The floor, ranked. Close more. Move up." />
      <LeaderboardView aeRows={aeRows} bdrRows={bdrRows} />
    </>
  );
}
