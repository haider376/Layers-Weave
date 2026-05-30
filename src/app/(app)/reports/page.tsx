import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/components/Logo";
import Topbar from "@/components/Topbar";
import PeriodTabs from "./PeriodTabs";

const STAGES = ["Appointment Scheduled", "Showed up", "No Show / Reschedule", "Initiation", "Handpick / Bulk Vintage", "Closed Won", "Closed Lost", "Disqualified"];
const OUTCOME_COLORS: Record<string, string> = {
  "No answer": "#EDD9A3", "Left voicemail": "#1f9e8f", Connected: "#A5EB00", "Meeting Booked": "#6D19FF",
  "Not Interested": "#A47BFF", Busy: "#EF9F27", "Wrong number": "#E24B4A", "Call Back Later": "#566872",
};
const LEAD_COLORS: Record<string, string> = {
  New: "#1f9e8f", "In Progress": "#A47BFF", "Open Deal": "#EF9F27", "Cool Off": "#E24B4A",
  "Data Quality": "#6D19FF", "Do Not Contact": "#566872",
};

function money(n: number) { return "$" + Math.round(n).toLocaleString("en-US"); }

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { period = "weekly" } = await searchParams;
  const days = period === "daily" ? 1 : period === "monthly" ? 30 : 7;
  const since = new Date(Date.now() - days * 86400000);

  const [deals, companies, quotes, fulfilments, calls, emails, meetings, users] = await Promise.all([
    prisma.deal.findMany({ include: { owner: true } }),
    prisma.company.findMany({ include: { owner: true } }),
    prisma.quote.findMany(),
    prisma.fulfilment.findMany(),
    prisma.callLog.findMany({ where: { createdAt: { gte: since } } }),
    prisma.emailMessage.count({ where: { createdAt: { gte: since }, direction: "outbound" } }),
    prisma.salesMeeting.count({ where: { bookedDate: { gte: since } } }),
    prisma.user.findMany(),
  ]);

  const won = deals.filter((d) => d.stage === "Closed Won");
  const wonValue = won.reduce((s, d) => s + d.amount, 0);
  const openValue = deals.filter((d) => !d.stage.startsWith("Closed") && d.stage !== "Disqualified").reduce((s, d) => s + d.amount, 0);

  // Closed/Won by AE ($)
  const wonByAe = new Map<string, number>();
  for (const d of won) { const n = d.owner?.name ?? "—"; wonByAe.set(n, (wonByAe.get(n) ?? 0) + d.amount); }
  const wonRows = [...wonByAe.entries()].sort((a, b) => b[1] - a[1]);
  const wonMax = Math.max(1, ...wonRows.map((r) => r[1]));

  // Pipeline by stage
  const stageRows = STAGES.map((s) => ({ s, n: deals.filter((d) => d.stage === s).length }));
  const stageMax = Math.max(1, ...stageRows.map((r) => r.n));

  // Deal count by owner
  const dealsByOwner = new Map<string, number>();
  for (const d of deals) { const n = d.owner?.name ?? "—"; dealsByOwner.set(n, (dealsByOwner.get(n) ?? 0) + 1); }
  const dealCountRows = [...dealsByOwner.entries()].sort((a, b) => b[1] - a[1]);
  const dealCountMax = Math.max(1, ...dealCountRows.map((r) => r[1]));

  // Call outcomes by rep (stacked)
  const byAgent = new Map<string, Map<string, number>>();
  for (const c of calls) {
    const a = c.agent ?? "—"; const o = c.outcome ?? "Other";
    if (!byAgent.has(a)) byAgent.set(a, new Map());
    const m = byAgent.get(a)!; m.set(o, (m.get(o) ?? 0) + 1);
  }
  const callRows = [...byAgent.entries()].map(([a, m]) => ({ a, total: [...m.values()].reduce((x, y) => x + y, 0), seg: m })).sort((x, y) => y.total - x.total);
  const callMax = Math.max(1, ...callRows.map((r) => r.total));

  // Lead status by owner (stacked)
  const leadByOwner = new Map<string, Map<string, number>>();
  for (const c of companies) {
    const o = c.owner?.name ?? "Unassigned"; const s = c.leadStatus;
    if (!leadByOwner.has(o)) leadByOwner.set(o, new Map());
    const m = leadByOwner.get(o)!; m.set(s, (m.get(s) ?? 0) + 1);
  }
  const leadRows = [...leadByOwner.entries()].map(([o, m]) => ({ o, total: [...m.values()].reduce((x, y) => x + y, 0), seg: m })).sort((x, y) => y.total - x.total).slice(0, 8);
  const leadMax = Math.max(1, ...leadRows.map((r) => r.total));

  // Leaderboard wins
  const winsByAe = new Map<string, { name: string; title: string; wins: number }>();
  for (const d of won) { if (!d.owner) continue; const c = winsByAe.get(d.owner.id) ?? { name: d.owner.name, title: d.owner.title, wins: 0 }; c.wins++; winsByAe.set(d.owner.id, c); }
  const leaderboard = [...winsByAe.values()].sort((a, b) => b.wins - a.wins).slice(0, 6);

  const periodLabel = period === "daily" ? "today" : period === "monthly" ? "this month" : "this week";
  const quotaGoal = period === "daily" ? 1000 : period === "monthly" ? 30000 : 7000;
  const quotaPct = Math.round((wonValue / quotaGoal) * 100);

  return (
    <>
      <Topbar title="Reports" sub={`Daily, weekly & monthly KPIs across all teams`} />
      <PeriodTabs period={period} />

      <div className="kpis" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        <Kpi label="Pipeline" value={money(openValue)} sub={`${deals.filter((d) => !d.stage.startsWith("Closed")).length} open`} />
        <Kpi label="Won" value={money(wonValue)} sub={`${won.length} deals`} accent="neon" />
        <Kpi label={`SQLs ${periodLabel}`} value={String(meetings)} sub="meetings booked" accent="vio" />
        <Kpi label={`Calls ${periodLabel}`} value={calls.length.toLocaleString("en-US")} sub="logged" />
        <Kpi label={`Emails ${periodLabel}`} value={String(emails)} sub="sent" />
        <Kpi label="Active quotes" value={String(quotes.filter((q) => q.status === "In Progress").length)} sub={`${fulfilments.filter((f) => f.orderStage !== "Delivered").length} in transit`} accent="vio" />
      </div>

      <div className="grid2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel title="Closed / Won by AE" count={periodLabel}>
          {wonRows.map(([name, v]) => (
            <BarRow key={name} label={name} value={money(v)} pct={(v / wonMax) * 100} />
          ))}
          {wonRows.length === 0 && <Empty />}
        </Panel>

        <Panel title="Pipeline health by stage">
          {stageRows.map((r) => (
            <BarRow key={r.s} label={r.s} value={String(r.n)} pct={(r.n / stageMax) * 100} color="var(--violet-br)" />
          ))}
        </Panel>

        <Panel title="Deal count by owner">
          {dealCountRows.map(([name, n]) => (
            <BarRow key={name} label={name} value={String(n)} pct={(n / dealCountMax) * 100} />
          ))}
        </Panel>

        <Panel title="AE leaderboard" count="deals won">
          <div className="lead">
            {leaderboard.map((p) => (
              <div className="lrow" key={p.name}>
                <span className="av">{initials(p.name)}</span>
                <span className="nm">{p.name}<small>{p.title}</small></span>
                <span className="mt">{p.wins}</span>
              </div>
            ))}
            {leaderboard.length === 0 && <Empty />}
          </div>
        </Panel>

        <Panel title={`Call outcomes by rep`} count={periodLabel}>
          {callRows.map((r) => (
            <StackRow key={r.a} label={r.a} total={r.total} max={callMax} seg={r.seg} colors={OUTCOME_COLORS} />
          ))}
          {callRows.length === 0 && <Empty />}
          <Legend colors={OUTCOME_COLORS} />
        </Panel>

        <Panel title="Lead status by owner">
          {leadRows.map((r) => (
            <StackRow key={r.o} label={r.o} total={r.total} max={leadMax} seg={r.seg} colors={LEAD_COLORS} />
          ))}
          <Legend colors={LEAD_COLORS} />
        </Panel>

        <Panel title={`Calls by rep`} count={periodLabel}>
          {callRows.map((r) => (
            <BarRow key={r.a} label={r.a} value={r.total.toLocaleString("en-US")} pct={(r.total / callMax) * 100} />
          ))}
          {callRows.length === 0 && <Empty />}
        </Panel>

        <Panel title="Sales quota" count={`${periodLabel} · goal $${quotaGoal.toLocaleString("en-US")}`}>
          <div className="quota">
            <div className="quota-top">
              <span className="quota-actual">{money(wonValue)}</span>
              <span className="quota-pct" style={{ color: quotaPct >= 100 ? "var(--neon)" : "var(--muted)" }}>{quotaPct}%</span>
            </div>
            <div className="quota-track"><i style={{ width: `${Math.min(100, quotaPct)}%` }} /><span className="quota-goal-mark" /></div>
            <div className="quota-foot">
              <span>{won.length} deals closed</span>
              <span>{quotaPct >= 100 ? "🎯 Goal smashed" : `${money(Math.max(0, quotaGoal - wonValue))} to goal`}</span>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: "neon" | "vio" }) {
  return (
    <div className={`kpi${accent === "vio" ? " v" : ""}`}>
      <span className="bar" />
      <div className="lbl">{label}</div>
      <div className={`val ${accent ?? ""}`}>{value}</div>
      <div className="delta">{sub}</div>
    </div>
  );
}

function Panel({ title, count, children }: { title: string; count?: string; children: React.ReactNode }) {
  return (
    <section className="panel" style={{ marginBottom: 0 }}>
      <div className="panel-h"><h2>{title}</h2>{count && <span className="count">{count}</span>}</div>
      <div className="report-body">{children}</div>
    </section>
  );
}

function BarRow({ label, value, pct, color }: { label: string; value: string; pct: number; color?: string }) {
  return (
    <div className="rbar">
      <span className="rbar-l" title={label}>{label}</span>
      <div className="rbar-track"><i style={{ width: `${Math.max(2, pct)}%`, background: color ?? "var(--neon)" }} /></div>
      <span className="rbar-v">{value}</span>
    </div>
  );
}

function StackRow({ label, total, max, seg, colors }: { label: string; total: number; max: number; seg: Map<string, number>; colors: Record<string, string> }) {
  const widthPct = (total / max) * 100;
  return (
    <div className="rbar">
      <span className="rbar-l" title={label}>{label}</span>
      <div className="rbar-track" style={{ width: `${Math.max(4, widthPct)}%`, display: "flex" }}>
        {[...seg.entries()].map(([k, v]) => (
          <i key={k} title={`${k}: ${v}`} style={{ width: `${(v / total) * 100}%`, background: colors[k] ?? "#566872", borderRadius: 0 }} />
        ))}
      </div>
      <span className="rbar-v">{total.toLocaleString("en-US")}</span>
    </div>
  );
}

function Legend({ colors }: { colors: Record<string, string> }) {
  return (
    <div className="legend">
      {Object.entries(colors).map(([k, c]) => (
        <span key={k} className="lg-item"><i style={{ background: c }} />{k}</span>
      ))}
    </div>
  );
}

function Empty() { return <div className="q-note" style={{ padding: 12 }}>No data for this period.</div>; }
