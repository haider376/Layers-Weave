import { redirect } from "next/navigation";
import { prisma, safe } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Topbar from "@/components/Topbar";
import PeriodTabs from "./PeriodTabs";
import AnalyticsBoard, { type Card, type Kpi } from "./AnalyticsBoard";

const STAGES = ["Appointment Scheduled", "Showed up", "No Show / Reschedule", "Initiation", "Handpick / Bulk Vintage", "Closed Won", "Closed Lost", "Disqualified"];
const PAL = ["#8A8A90", "#C6F542", "#C9C9CC", "#E0B23C", "#A9DF1E", "#6A6A70", "#646469", "#2A2A2E"];
const OUTCOME_COLORS: Record<string, string> = { "No answer": "#2A2A2E", "Left voicemail": "#8A8A90", Connected: "#C6F542", "Meeting Booked": "#A9DF1E", "Not Interested": "#C9C9CC", Busy: "#E0B23C", "Wrong number": "#F0594F", "Call Back Later": "#646469" };
const LEAD_COLORS: Record<string, string> = { New: "#8A8A90", "In Progress": "#C9C9CC", "Open Deal": "#C6F542", "Cool Off": "#F0594F", "Data Quality": "#E0B23C", "Do Not Contact": "#646469" };
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { period = "weekly" } = await searchParams;
  const days = period === "daily" ? 1 : period === "monthly" ? 30 : 7;
  const since = new Date(Date.now() - days * 86400000);

  const [deals, companies, quotes, fulfilments, calls, emails, meetings] = await Promise.all([
    prisma.deal.findMany({ include: { owner: true } }),
    prisma.company.findMany({ include: { owner: true } }),
    prisma.quote.findMany(),
    prisma.fulfilment.findMany(),
    safe(prisma.callLog.findMany({ take: 5000 }), []),
    prisma.emailMessage.count({ where: { createdAt: { gte: since }, direction: "outbound" } }),
    prisma.salesMeeting.count({ where: { bookedDate: { gte: since } } }),
  ]);

  const won = deals.filter((d) => d.stage === "Closed Won");
  const wonValue = won.reduce((s, d) => s + d.amount, 0);
  const openDeals = deals.filter((d) => !d.stage.startsWith("Closed") && d.stage !== "Disqualified");
  const callsInPeriod = calls.filter((c) => c.createdAt >= since).length;

  const kpis: Kpi[] = [
    { label: "Pipeline", value: money(openDeals.reduce((s, d) => s + d.amount, 0)), sub: `${openDeals.length} open` },
    { label: "Won", value: money(wonValue), sub: `${won.length} deals`, accent: "neon" },
    { label: "SQLs", value: String(meetings), sub: "booked", accent: "vio" },
    { label: "Calls", value: callsInPeriod.toLocaleString("en-US"), sub: "logged" },
    { label: "Emails", value: String(emails), sub: "sent" },
    { label: "Win rate", value: `${deals.filter((d) => d.stage.startsWith("Closed")).length ? Math.round((won.length / deals.filter((d) => d.stage.startsWith("Closed")).length) * 100) : 0}%`, sub: "closed deals", accent: "vio" },
  ];

  // donut: pipeline by stage
  const pipelineDonut = STAGES.map((s, i) => ({ label: s, value: deals.filter((d) => d.stage === s).length, color: PAL[i % PAL.length] })).filter((d) => d.value > 0);
  // donut: win / loss
  const winLossDonut = [
    { label: "Won", value: won.length, color: "#C6F542" },
    { label: "Open", value: openDeals.length, color: "#8A8A90" },
    { label: "Lost", value: deals.filter((d) => d.stage === "Closed Lost").length, color: "#F0594F" },
    { label: "Disqualified", value: deals.filter((d) => d.stage === "Disqualified").length, color: "#646469" },
  ].filter((d) => d.value > 0);
  // donut: lead status
  const leadCounts = new Map<string, number>();
  for (const c of companies) leadCounts.set(c.leadStatus, (leadCounts.get(c.leadStatus) ?? 0) + 1);
  const leadDonut = [...leadCounts.entries()].map(([label, value]) => ({ label, value, color: LEAD_COLORS[label] ?? "#646469" }));

  // bars: won by AE
  const wonByAe = new Map<string, number>();
  for (const d of won) { const n = d.owner?.name ?? "—"; wonByAe.set(n, (wonByAe.get(n) ?? 0) + d.amount); }
  const wonBars = [...wonByAe.entries()].sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, value: money(v), pct: v }));

  // bars: deal count by owner
  const dealsByOwner = new Map<string, number>();
  for (const d of deals) { const n = d.owner?.name ?? "—"; dealsByOwner.set(n, (dealsByOwner.get(n) ?? 0) + 1); }
  const dealBars = [...dealsByOwner.entries()].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, value: String(n), pct: n, color: "var(--muted)" }));

  // stacked: call outcomes by rep
  const byAgent = new Map<string, Map<string, number>>();
  for (const c of calls) { const a = c.agent ?? "—"; const o = c.outcome ?? "Other"; if (!byAgent.has(a)) byAgent.set(a, new Map()); const m = byAgent.get(a)!; m.set(o, (m.get(o) ?? 0) + 1); }
  const callStacked = [...byAgent.entries()].map(([label, m]) => ({ label, total: [...m.values()].reduce((x, y) => x + y, 0), segs: [...m.entries()].map(([k, v]) => ({ k, v, color: OUTCOME_COLORS[k] ?? "#646469" })) })).sort((a, b) => b.total - a.total);

  // stacked: lead status by owner
  const leadByOwner = new Map<string, Map<string, number>>();
  for (const c of companies) { const o = c.owner?.name ?? "Unassigned"; if (!leadByOwner.has(o)) leadByOwner.set(o, new Map()); const m = leadByOwner.get(o)!; m.set(c.leadStatus, (m.get(c.leadStatus) ?? 0) + 1); }
  const leadStacked = [...leadByOwner.entries()].map(([label, m]) => ({ label, total: [...m.values()].reduce((x, y) => x + y, 0), segs: [...m.entries()].map(([k, v]) => ({ k, v, color: LEAD_COLORS[k] ?? "#646469" })) })).sort((a, b) => b.total - a.total).slice(0, 8);

  // spark: calls last 14 days
  const trend = Array.from({ length: 14 }, (_, i) => {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - (13 - i));
    const d1 = new Date(d0); d1.setDate(d1.getDate() + 1);
    return calls.filter((c) => c.createdAt >= d0 && c.createdAt < d1).length;
  });

  const quotaGoal = period === "daily" ? 1000 : period === "monthly" ? 30000 : 7000;
  const quotaPct = Math.round((wonValue / quotaGoal) * 100);

  // funnel — conversion through the pipeline
  const FUNNEL_STAGES = ["Appointment Scheduled", "Showed up", "Initiation", "Handpick / Bulk Vintage", "Closed Won"];
  const funnel = FUNNEL_STAGES.map((s) => ({ label: s, value: deals.filter((d) => d.stage === s).length }));

  // forecast — weighted pipeline by stage win-probability
  const PROB: Record<string, number> = { "Appointment Scheduled": 0.1, "Showed up": 0.25, "No Show / Reschedule": 0.05, Initiation: 0.4, "Handpick / Bulk Vintage": 0.6 };
  const openByStage = new Map<string, number>();
  for (const d of openDeals) openByStage.set(d.stage, (openByStage.get(d.stage) ?? 0) + d.amount);
  const weighted = openDeals.reduce((s, d) => s + d.amount * (PROB[d.stage] ?? 0.1), 0);
  const openTotal = openDeals.reduce((s, d) => s + d.amount, 0);
  const forecastRows = [...openByStage.entries()].sort((a, b) => b[1] - a[1]).map(([label, v]) => ({ label, value: money(Math.round(v * (PROB[label] ?? 0.1))), pct: v * (PROB[label] ?? 0.1) }));

  const cards: Card[] = [
    { id: "funnel", title: "Conversion funnel", hint: "stage → stage", type: "funnel", data: funnel },
    { id: "forecast", title: "Revenue forecast", hint: "weighted pipeline", type: "forecast", data: { committed: money(wonValue), weighted: money(weighted), best: money(wonValue + openTotal), rows: forecastRows } },
    { id: "pipeline", title: "Pipeline by stage", hint: "deals", type: "donut", data: pipelineDonut, center: "deals" },
    { id: "winloss", title: "Win / Loss", hint: "all deals", type: "donut", data: winLossDonut, center: "deals" },
    { id: "wonByAe", title: "Closed / Won by AE", hint: "revenue", type: "bars", data: wonBars },
    { id: "calls", title: "Calls — last 14 days", hint: "team", type: "spark", data: trend },
    { id: "callOutcomes", title: "Call outcomes by rep", type: "stacked", data: callStacked },
    { id: "lead", title: "Lead status split", hint: "companies", type: "donut", data: leadDonut, center: "accounts" },
    { id: "dealsByOwner", title: "Deal count by owner", type: "bars", data: dealBars },
    { id: "leadByOwner", title: "Lead status by owner", type: "stacked", data: leadStacked },
    { id: "quota", title: "Sales quota", hint: `goal ${money(quotaGoal)}`, type: "quota", data: { actual: money(wonValue), goal: money(quotaGoal), pct: quotaPct, deals: won.length } },
  ];

  return (
    <>
      <Topbar title="Sales Analytics" sub="Pipeline, conversion, calls & sales KPIs" />
      <PeriodTabs period={period} />
      <AnalyticsBoard kpis={kpis} cards={cards} storageKey="sales-order" />
    </>
  );
}
