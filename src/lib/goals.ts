import { prisma, safe } from "@/lib/db";

// ── Sales goals ───────────────────────────────────────────────────────────
// Targets are authored WEEKLY; the monthly target is weekly × WEEKS_PER_MONTH.
// The whole-team monthly goal is the SUM of every rep's monthly goal.
//
// Key metrics (deal-stage driven):
//   SQL  = Meeting booked        (Appointment Scheduled)
//   SQM  = Showed up
//   SQO  = Initiation
//   Closed Won = main quota (revenue)
//
// A rep is an "AE" (full revenue + SQL/SQM/SQO/calls) or a "BDR"
// (top-of-funnel: SQL/SQM/calls only).

export const WEEKS_PER_MONTH = 4;

export type RepKind = "AE" | "BDR";

// All metrics a goal can carry. BDRs simply leave revenue/sqo at 0.
export type Metric = "revenue" | "sql" | "sqm" | "sqo" | "calls";
export const METRICS: Metric[] = ["revenue", "sql", "sqm", "sqo", "calls"];
export const METRIC_LABEL: Record<Metric, string> = {
  revenue: "Closed Won",
  sql: "SQL",
  sqm: "SQM",
  sqo: "SQO",
  calls: "Calls",
};

export type Weekly = { revenue: number; sql: number; sqm: number; sqo: number; calls: number };

export type SalesGoals = {
  // per-rep WEEKLY targets, keyed by first-name (lowercase)
  weekly: Record<string, Weekly>;
};

export const AE_FIRST = ["haider", "zikriya", "rija", "asjad", "adan", "kamila"];
export const BDR_FIRST = ["fatima", "huzaifa", "hayaa"];

export const ROSTER: { first: string; kind: RepKind }[] = [
  ...AE_FIRST.map((first) => ({ first, kind: "AE" as RepKind })),
  ...BDR_FIRST.map((first) => ({ first, kind: "BDR" as RepKind })),
];

export const kindOf = (first: string): RepKind => (BDR_FIRST.includes(first.toLowerCase()) ? "BDR" : "AE");

// Spec defaults (weekly).
export const AE_WEEKLY: Weekly = { revenue: 5000, sql: 7, sqm: 5, sqo: 3, calls: 450 };
export const BDR_WEEKLY: Weekly = { revenue: 0, sql: 5, sqm: 4, sqo: 0, calls: 500 };

export function defaultWeekly(first: string): Weekly {
  return kindOf(first) === "BDR" ? { ...BDR_WEEKLY } : { ...AE_WEEKLY };
}

export const DEFAULT_GOALS: SalesGoals = {
  weekly: Object.fromEntries(ROSTER.map(({ first }) => [first, defaultWeekly(first)])),
};

const KEY = "sales-goals";

export async function getSalesGoals(): Promise<SalesGoals> {
  const row = await safe(prisma.appSetting.findUnique({ where: { key: KEY } }), null);
  const weekly: Record<string, Weekly> = {};
  let saved: Partial<SalesGoals> = {};
  if (row?.value) { try { saved = JSON.parse(row.value) as Partial<SalesGoals>; } catch { saved = {}; } }
  for (const { first } of ROSTER) {
    weekly[first] = { ...defaultWeekly(first), ...(saved.weekly?.[first] ?? {}) };
  }
  return { weekly };
}

export async function saveSalesGoals(goals: SalesGoals): Promise<void> {
  await safe(
    prisma.appSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: JSON.stringify(goals) },
      update: { value: JSON.stringify(goals) },
    }),
    null,
  );
}

// ── Derived helpers ────────────────────────────────────────────────────────
export const toMonthly = (w: Weekly): Weekly => ({
  revenue: w.revenue * WEEKS_PER_MONTH,
  sql: w.sql * WEEKS_PER_MONTH,
  sqm: w.sqm * WEEKS_PER_MONTH,
  sqo: w.sqo * WEEKS_PER_MONTH,
  calls: w.calls * WEEKS_PER_MONTH,
});

export function teamTotals(goals: SalesGoals, period: "weekly" | "monthly"): Weekly {
  const blank: Weekly = { revenue: 0, sql: 0, sqm: 0, sqo: 0, calls: 0 };
  return ROSTER.reduce((acc, { first }) => {
    const w = goals.weekly[first] ?? defaultWeekly(first);
    const g = period === "monthly" ? toMonthly(w) : w;
    acc.revenue += g.revenue; acc.sql += g.sql; acc.sqm += g.sqm; acc.sqo += g.sqo; acc.calls += g.calls;
    return acc;
  }, blank);
}
