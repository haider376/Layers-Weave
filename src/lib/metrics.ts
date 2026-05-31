// Key sales metrics derived from deal stages. The funnel is cumulative:
// once a deal reaches a deeper stage it counts for every shallower metric too
// (e.g. a deal that jumps straight to Initiation credits SQL + SQM + SQO).
//
//   SQL  (Meeting booked)  → Appointment Scheduled and beyond
//   SQM  (Showed up)       → Showed up and beyond
//   SQO  (Initiation)      → Initiation and beyond
//   Closed Won             → revenue quota

// Ordered pipeline used for cumulative ranking. "Closed Won" is the deepest
// positive outcome; dead-end stages (Lost / Disqualified / No Show) get rank 0
// but are still counted for the shallower metrics they passed through is NOT
// assumed — only forward progress on the happy path credits a metric.
export const STAGE_RANK: Record<string, number> = {
  "Appointment Scheduled": 1, // SQL
  "No Show / Reschedule": 1, // booked, so still an SQL
  "Showed up": 2, // SQM
  Initiation: 3, // SQO
  "Closed Won": 4,
  "Closed Lost": 3, // reached negotiation/initiation before losing
  Disqualified: 0,
};

export const SQL_RANK = 1;
export const SQM_RANK = 2;
export const SQO_RANK = 3;

export type DealLike = { stage: string; ownerId: string | null; amount: number };

export type RepMetrics = { revenue: number; sql: number; sqm: number; sqo: number; calls: number };

export function metricsForOwner(deals: DealLike[], ownerId: string, calls: number): RepMetrics {
  const mine = deals.filter((d) => d.ownerId === ownerId);
  let sql = 0, sqm = 0, sqo = 0, revenue = 0;
  for (const d of mine) {
    const rank = STAGE_RANK[d.stage] ?? 0;
    if (rank >= SQL_RANK) sql++;
    if (rank >= SQM_RANK) sqm++;
    if (rank >= SQO_RANK) sqo++;
    if (d.stage === "Closed Won") revenue += d.amount;
  }
  return { revenue, sql, sqm, sqo, calls };
}
