import "server-only";
import { prisma } from "./db";

// ── Merge & dedupe engine ───────────────────────────────────────────────────
// Detects likely-duplicate companies (by domain, else normalized name) and
// contacts (by email, else normalized name + company), and merges a group into
// a chosen master — reassigning every related record before deleting the dupes.

export type DupeRecord = {
  id: string; primary: string; secondary: string; meta: string; completeness: number;
};
export type DupeGroup = { key: string; reason: string; records: DupeRecord[] };

const LEGAL = /\b(ltd|limited|llc|inc|co|company|gmbh|srl|s\.r\.l|bv|b\.v|sa|plc|corp|pvt)\b/g;
function normName(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(LEGAL, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}
function normDomain(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
}
const normEmail = (s: string | null | undefined) => (s ?? "").toLowerCase().trim();
const score = (vals: (string | number | null | undefined)[]) => vals.filter((v) => v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "—").length;

// ── Detection ────────────────────────────────────────────────────────────────
export async function findCompanyDuplicates(): Promise<DupeGroup[]> {
  const rows = await prisma.company.findMany({
    select: { id: true, name: true, clientId: true, domain: true, phone: true, country: true, leadStatus: true, _count: { select: { contacts: true, deals: true } } },
    take: 20000,
  });
  const groups = new Map<string, { reason: string; recs: DupeRecord[] }>();
  for (const c of rows) {
    const dom = normDomain(c.domain);
    const key = dom ? `d:${dom}` : `n:${normName(c.name)}`;
    if (key === "n:" ) continue;
    const rec: DupeRecord = {
      id: c.id, primary: c.name, secondary: c.clientId,
      meta: [c.domain, c.country, `${c._count.contacts} contacts`, `${c._count.deals} deals`].filter(Boolean).join(" · "),
      completeness: score([c.domain, c.phone, c.country]) + c._count.contacts + c._count.deals,
    };
    const g = groups.get(key) ?? { reason: dom ? "Same domain" : "Same name", recs: [] };
    g.recs.push(rec);
    groups.set(key, g);
  }
  return [...groups.entries()].filter(([, g]) => g.recs.length > 1)
    .map(([key, g]) => ({ key, reason: g.reason, records: g.recs.sort((a, b) => b.completeness - a.completeness) }));
}

export async function findContactDuplicates(): Promise<DupeGroup[]> {
  const rows = await prisma.contact.findMany({
    select: { id: true, name: true, email: true, phone: true, title: true, companyId: true, company: { select: { name: true } } },
    take: 20000,
  });
  const groups = new Map<string, { reason: string; recs: DupeRecord[] }>();
  for (const c of rows) {
    const email = normEmail(c.email);
    const key = email ? `e:${email}` : `n:${normName(c.name)}|${c.companyId}`;
    if (key === `n:|${c.companyId}`) continue;
    const rec: DupeRecord = {
      id: c.id, primary: c.name, secondary: c.email ?? c.phone ?? "—",
      meta: [c.title, c.company?.name].filter(Boolean).join(" · "),
      completeness: score([c.email, c.phone, c.title]),
    };
    const g = groups.get(key) ?? { reason: email ? "Same email" : "Same name + company", recs: [] };
    g.recs.push(rec);
    groups.set(key, g);
  }
  return [...groups.entries()].filter(([, g]) => g.recs.length > 1)
    .map(([key, g]) => ({ key, reason: g.reason, records: g.recs.sort((a, b) => b.completeness - a.completeness) }));
}

// ── Merge ──────────────────────────────────────────────────────────────────--
// Move every related row off the dupes onto the master, fill master blanks,
// then delete the dupes. Order matters: reassign FK rows BEFORE delete (the
// company/contact cascades would otherwise wipe them).
export async function mergeCompanies(masterId: string, dupeIds: string[]): Promise<{ merged: number }> {
  const ids = dupeIds.filter((id) => id && id !== masterId);
  if (!ids.length) return { merged: 0 };
  const master = await prisma.company.findUnique({ where: { id: masterId } });
  if (!master) throw new Error("master not found");

  for (const dupeId of ids) {
    const dupe = await prisma.company.findUnique({ where: { id: dupeId } });
    if (!dupe) continue;
    // Fill master blanks from the dupe (don't overwrite existing values).
    const patch: Record<string, unknown> = {};
    for (const f of ["domain", "phone", "country", "state", "region", "email", "type", "tier", "aiNotes", "source"] as const) {
      if (!master[f] && dupe[f]) patch[f] = dupe[f];
    }
    if (!master.numberEmployees && dupe.numberEmployees) patch.numberEmployees = dupe.numberEmployees;
    if (Object.keys(patch).length) await prisma.company.update({ where: { id: masterId }, data: patch }).catch(() => {});

    await prisma.contact.updateMany({ where: { companyId: dupeId }, data: { companyId: masterId } }).catch(() => {});
    await prisma.deal.updateMany({ where: { companyId: dupeId }, data: { companyId: masterId } }).catch(() => {});
    await prisma.callLog.updateMany({ where: { companyId: dupeId }, data: { companyId: masterId } }).catch(() => {});
    await prisma.emailMessage.updateMany({ where: { companyId: dupeId }, data: { companyId: masterId } }).catch(() => {});
    await prisma.whatsAppMessage.updateMany({ where: { companyId: dupeId }, data: { companyId: masterId } }).catch(() => {});
    await prisma.activity.updateMany({ where: { companyId: dupeId }, data: { companyId: masterId } }).catch(() => {});
    await prisma.task.updateMany({ where: { companyId: dupeId }, data: { companyId: masterId } }).catch(() => {});
    await prisma.company.delete({ where: { id: dupeId } }).catch(() => {});
  }
  return { merged: ids.length };
}

export async function mergeContacts(masterId: string, dupeIds: string[]): Promise<{ merged: number }> {
  const ids = dupeIds.filter((id) => id && id !== masterId);
  if (!ids.length) return { merged: 0 };
  const master = await prisma.contact.findUnique({ where: { id: masterId } });
  if (!master) throw new Error("master not found");

  for (const dupeId of ids) {
    const dupe = await prisma.contact.findUnique({ where: { id: dupeId } });
    if (!dupe) continue;
    const patch: Record<string, unknown> = {};
    for (const f of ["email", "phone", "title"] as const) {
      if (!master[f] && dupe[f]) patch[f] = dupe[f];
    }
    if (Object.keys(patch).length) await prisma.contact.update({ where: { id: masterId }, data: patch }).catch(() => {});

    await prisma.callLog.updateMany({ where: { contactId: dupeId }, data: { contactId: masterId } }).catch(() => {});
    await prisma.deal.updateMany({ where: { contactId: dupeId }, data: { contactId: masterId } }).catch(() => {});
    await prisma.whatsAppMessage.updateMany({ where: { contactId: dupeId }, data: { contactId: masterId } }).catch(() => {});
    await prisma.emailMessage.updateMany({ where: { contactId: dupeId }, data: { contactId: masterId } }).catch(() => {});
    await prisma.activity.updateMany({ where: { contactId: dupeId }, data: { contactId: masterId } }).catch(() => {});
    await prisma.task.updateMany({ where: { contactId: dupeId }, data: { contactId: masterId } }).catch(() => {});
    // Cadence memberships of the dupe are removed with it (cascade) — master
    // keeps its own enrollment; avoids the unique [cadence, contact] conflict.
    await prisma.contact.delete({ where: { id: dupeId } }).catch(() => {});
  }
  return { merged: ids.length };
}
