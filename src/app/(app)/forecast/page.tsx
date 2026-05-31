import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Topbar from "@/components/Topbar";
import ForecastBoard, { type FDeal } from "./ForecastBoard";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// Win-probability per open stage (commit forecasting).
const PROB: Record<string, number> = {
  "Appointment Scheduled": 0.1,
  "Showed up": 0.25,
  "No Show / Reschedule": 0.05,
  Initiation: 0.45,
};

export default async function ForecastPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const deals = await prisma.deal.findMany({ include: { owner: true, company: true }, orderBy: { amount: "desc" } });
  const won = deals.filter((d) => d.stage === "Closed Won");
  const open = deals.filter((d) => !d.stage.startsWith("Closed") && d.stage !== "Disqualified");

  const committed = won.reduce((s, d) => s + d.amount, 0);
  const weighted = open.reduce((s, d) => s + d.amount * (PROB[d.stage] ?? 0.1), 0);
  const bestCase = committed + open.reduce((s, d) => s + d.amount, 0);

  const fdeals: FDeal[] = open.map((d) => ({
    id: d.id,
    name: d.name.replace(/ × Layers$/, ""),
    company: d.company?.name ?? "—",
    owner: d.owner?.name ?? "Unassigned",
    stage: d.stage,
    amount: d.amount,
    prob: Math.round((PROB[d.stage] ?? 0.1) * 100),
    weighted: Math.round(d.amount * (PROB[d.stage] ?? 0.1)),
  }));

  // By-owner roll-up.
  const byOwner = new Map<string, { weighted: number; count: number }>();
  for (const d of fdeals) {
    const cur = byOwner.get(d.owner) ?? { weighted: 0, count: 0 };
    cur.weighted += d.weighted; cur.count += 1;
    byOwner.set(d.owner, cur);
  }
  const ownerRows = [...byOwner.entries()].sort((a, b) => b[1].weighted - a[1].weighted);
  const ownerMax = Math.max(1, ...ownerRows.map((r) => r[1].weighted));

  return (
    <>
      <Topbar title="Forecast" sub="Commit, weighted pipeline & best case — close the quarter" />

      <div className="kpis" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi"><span className="bar" /><div className="lbl">Committed (Won)</div><div className="val neon">{money(committed)}</div><div className="delta">{won.length} closed</div></div>
        <div className="kpi v"><span className="bar" /><div className="lbl">Weighted pipeline</div><div className="val vio">{money(weighted)}</div><div className="delta">{open.length} open · prob-adjusted</div></div>
        <div className="kpi"><span className="bar" /><div className="lbl">Best case</div><div className="val">{money(bestCase)}</div><div className="delta">won + all open</div></div>
        <div className="kpi"><span className="bar" /><div className="lbl">Forecast total</div><div className="val neon">{money(committed + weighted)}</div><div className="delta">committed + weighted</div></div>
      </div>

      <div className="grid2" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, alignItems: "start" }}>
        <ForecastBoard deals={fdeals} />
        <section className="panel">
          <div className="panel-h"><h2>Weighted by owner</h2><span className="count">prob-adjusted</span></div>
          <div className="an-body" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {ownerRows.map(([o, v]) => (
              <div className="rbar" key={o}>
                <span className="rbar-l" title={o}>{o.split(" ")[0]}</span>
                <div className="rbar-track"><i style={{ width: `${(v.weighted / ownerMax) * 100}%`, background: "var(--neon)" }} /></div>
                <span className="rbar-v">{money(v.weighted)}</span>
              </div>
            ))}
            {ownerRows.length === 0 && <div className="q-note" style={{ padding: 30 }}>No open pipeline.</div>}
          </div>
        </section>
      </div>
    </>
  );
}
