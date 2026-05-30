import { prisma, safe } from "./db";

// AE (deals won) + BDR (SQLs booked) leaderboards for the sales right-rail.
export async function salesLeaderboards() {
  const [deals, meetings] = await Promise.all([
    prisma.deal.findMany({ where: { stage: "Closed Won" }, include: { owner: true } }),
    prisma.salesMeeting.findMany({ include: { bdr: true } }),
  ]);
  const ae = new Map<string, number>();
  for (const d of deals) if (d.owner) ae.set(d.owner.name, (ae.get(d.owner.name) ?? 0) + 1);
  const bdr = new Map<string, number>();
  for (const m of meetings) if (m.bdr) bdr.set(m.bdr.name, (bdr.get(m.bdr.name) ?? 0) + 1);
  const top = (m: Map<string, number>, sub: string) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, n]) => ({ label, value: String(n), pct: n, sub }));
  return { aeRows: top(ae, "deals won"), bdrRows: top(bdr, "SQLs booked") };
}

export type TimelineEvent = {
  id: string;
  kind: "note" | "email" | "call" | "meeting" | "system";
  title: string;
  body?: string;
  actor?: string;
  at: Date;
  meta?: string;
};

// Unified activity timeline for a company (and optionally a single deal).
export async function getTimeline(opts: { companyId?: string; dealId?: string; contactId?: string }): Promise<TimelineEvent[]> {
  const where = opts.dealId
    ? { dealId: opts.dealId }
    : opts.contactId
      ? { contactId: opts.contactId }
      : { companyId: opts.companyId };

  const [activities, emails, calls, meetings] = await Promise.all([
    prisma.activity.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.emailMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
    safe(prisma.callLog.findMany({ where: opts.contactId ? { contactId: opts.contactId } : opts.dealId ? { dealId: opts.dealId } : { companyId: opts.companyId }, orderBy: { createdAt: "desc" }, take: 50 }), []),
    opts.dealId
      ? prisma.salesMeeting.findMany({ where: { dealId: opts.dealId }, orderBy: { bookedDate: "desc" }, take: 20 })
      : opts.companyId
        ? prisma.salesMeeting.findMany({ where: { deal: { companyId: opts.companyId } }, orderBy: { bookedDate: "desc" }, take: 20 })
        : Promise.resolve([]),
  ]);

  const events: TimelineEvent[] = [];
  for (const a of activities) {
    if (a.type === "email" || a.type === "call") continue; // represented by their own tables
    events.push({ id: a.id, kind: a.type === "meeting" ? "meeting" : a.type === "system" || a.type === "stage" ? "system" : "note", title: a.type === "note" ? "Note" : a.body, body: a.type === "note" ? a.body : undefined, actor: a.actor ?? undefined, at: a.createdAt });
  }
  for (const e of emails) {
    events.push({ id: e.id, kind: "email", title: `${e.direction === "outbound" ? "Sent" : "Received"}: ${e.subject}`, body: e.body, actor: e.direction === "outbound" ? e.fromAddr : e.fromAddr, at: e.createdAt, meta: e.direction });
  }
  for (const c of calls) {
    events.push({ id: c.id, kind: "call", title: `Call — ${c.outcome ?? "logged"}`, body: c.notes ?? undefined, actor: c.agent ?? undefined, at: c.createdAt, meta: c.durationSec ? `${Math.round(c.durationSec / 60)}m` : undefined });
  }
  for (const m of meetings) {
    events.push({ id: m.id, kind: "meeting", title: `Meeting — ${m.status}${m.outcome ? ` · ${m.outcome}` : ""}`, at: m.meetingDate ?? m.bookedDate });
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 60);
}
