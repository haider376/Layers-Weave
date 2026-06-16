import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Topbar from "@/components/Topbar";
import PeriodTabs from "../reports/PeriodTabs";
import AnalyticsBoard, { type Card, type Kpi } from "../reports/AnalyticsBoard";
import { WINLOSS_COLORS, TIER_COLORS, BRAND } from "@/lib/statusColors";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { period = "monthly" } = await searchParams;

  const [deals, companies] = await Promise.all([
    prisma.deal.findMany({ include: { owner: true } }),
    prisma.company.findMany({ include: { owner: true } }),
  ]);

  const won = deals.filter((d) => d.stage === "Closed Won");
  const wonValue = won.reduce((s, d) => s + d.amount, 0);
  const open = deals.filter((d) => !d.stage.startsWith("Closed") && d.stage !== "Disqualified");
  const openValue = open.reduce((s, d) => s + d.amount, 0);
  const avgDeal = won.length ? wonValue / won.length : 0;
  const winRate = deals.filter((d) => d.stage.startsWith("Closed")).length
    ? Math.round((won.length / deals.filter((d) => d.stage.startsWith("Closed")).length) * 100) : 0;

  const quotaGoal = period === "daily" ? 1000 : period === "monthly" ? 30000 : 7000;
  const quotaPct = Math.round((wonValue / quotaGoal) * 100);

  // Monthly revenue — last 6 months (closed-won by close/create date)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], revenue: 0 };
  });
  const mByKey = new Map(months.map((m) => [m.key, m]));
  for (const d of won) { const w = d.closeDate ?? d.createDate; const b = mByKey.get(`${w.getFullYear()}-${w.getMonth()}`); if (b) b.revenue += d.amount; }
  const monthlyBars = months.map((m) => ({ label: m.label, value: money(m.revenue), pct: m.revenue, color: BRAND.lime }));
  const growthPct = months[4].revenue ? Math.round(((months[5].revenue - months[4].revenue) / months[4].revenue) * 100) : months[5].revenue ? 100 : 0;
  let acc = 0;
  const cumulativeSpark = months.map((m) => (acc += m.revenue));

  const kpis: Kpi[] = [
    { label: "Closed revenue", value: money(wonValue), sub: `${won.length} deals`, accent: "neon" },
    { label: "Open pipeline", value: money(openValue), sub: `${open.length} deals`, accent: "vio" },
    { label: "Avg deal size", value: money(avgDeal), sub: "per closed-won" },
    { label: "Win rate", value: `${winRate}%`, sub: "closed deals", accent: "neon" },
    { label: "Quota attainment", value: `${quotaPct}%`, sub: `goal ${money(quotaGoal)}`, accent: "vio" },
    { label: "Forecast (weighted)", value: money(Math.round(openValue * 0.35 + wonValue)), sub: "this period" },
    { label: "MoM growth", value: `${growthPct >= 0 ? "+" : ""}${growthPct}%`, sub: "vs last month", accent: growthPct >= 0 ? "neon" : "vio" },
  ];

  // Revenue by AE
  const byAe = new Map<string, number>();
  for (const d of won) { const n = d.owner?.name ?? "—"; byAe.set(n, (byAe.get(n) ?? 0) + d.amount); }
  const aeRows = [...byAe.entries()].sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, value: money(v), pct: v }));

  // Book of Business — accounts per owner (cap = 200)
  const bobMap = new Map<string, number>();
  for (const c of companies) { const o = c.owner?.name ?? "Unassigned"; bobMap.set(o, (bobMap.get(o) ?? 0) + 1); }
  const bobRows = [...bobMap.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, value: `${n}/200`, pct: n }));

  // Revenue by tier
  const tierMap = new Map<string, number>();
  for (const d of won) { const c = companies.find((x) => x.id === d.companyId); const t = c?.tier ?? "—"; tierMap.set(t, (tierMap.get(t) ?? 0) + d.amount); }
  const tierDonut = [...tierMap.entries()].map(([label, value], i) => ({ label: `Tier ${label}`, value: Math.round(value), color: TIER_COLORS[i % TIER_COLORS.length] }));

  // Win/Loss value
  const lostValue = deals.filter((d) => d.stage === "Closed Lost").reduce((s, d) => s + d.amount, 0);
  const wlDonut = [
    { label: "Won", value: Math.round(wonValue), color: WINLOSS_COLORS.Won },
    { label: "Open", value: Math.round(openValue), color: WINLOSS_COLORS.Open },
    { label: "Lost", value: Math.round(lostValue), color: WINLOSS_COLORS.Lost },
  ].filter((d) => d.value > 0);

  const cards: Card[] = [
    { id: "monthly", title: "Monthly revenue", hint: "closed-won · 6 months", type: "bars", data: monthlyBars },
    { id: "runrate", title: "Cumulative revenue", hint: "running total", type: "spark", data: cumulativeSpark },
    { id: "quota", title: "Quota attainment", hint: "vs goal", type: "quota", data: { actual: money(wonValue), goal: money(quotaGoal), pct: quotaPct, deals: won.length } },
    { id: "aeRev", title: "Revenue by AE", hint: "closed-won", type: "bars", data: aeRows },
    { id: "wl", title: "Revenue split", hint: "won / open / lost", type: "donut", data: wlDonut, center: "value" },
    { id: "bob", title: "Book of business", hint: "accounts / cap", type: "bars", data: bobRows },
    { id: "tier", title: "Revenue by tier", hint: "closed-won", type: "donut", data: tierDonut.length ? tierDonut : [{ label: "No data", value: 1, color: "#2A2A2E" }], center: "value" },
    { id: "forecast", title: "Forecast", hint: "weighted", type: "forecast", data: { committed: money(wonValue), weighted: money(Math.round(openValue * 0.35)), best: money(wonValue + openValue), rows: aeRows.slice(0, 5) } },
  ];

  return (
    <>
      <Topbar title="Revenue Analytics" sub="Closed revenue, forecast, win rate & book of business" />
      <PeriodTabs period={period} basePath="/revenue" />
      <AnalyticsBoard kpis={kpis} cards={cards} storageKey="revenue-order" />
    </>
  );
}
