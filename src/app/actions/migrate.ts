"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// ── HubSpot migration (CSV) ─────────────────────────────────────────────────
// Admin-only. Clients parse the HubSpot CSV export in the browser and stream it
// here in chunks (Record<string,string> rows with lowercased headers). We map
// HubSpot's columns → our schema, dedupe, and bulk-insert.

async function guardAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw new Error("FORBIDDEN");
  return user;
}

const pick = (r: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) { const v = r[k]; if (v != null && String(v).trim()) return String(v).trim(); }
  return "";
};

// Map a HubSpot "Lifecycle Stage" / "Lead Status" to our leadStatus vocabulary.
function mapLeadStatus(raw: string): string {
  const s = raw.toLowerCase();
  if (!s) return "New";
  if (s.includes("customer") || s.includes("won")) return "Open Deal";
  if (s.includes("opportunity") || s.includes("deal")) return "Open Deal";
  if (s.includes("lead") || s.includes("subscriber") || s.includes("new")) return "New";
  if (s.includes("progress") || s.includes("qualified")) return "In Progress";
  if (s.includes("unqualified") || s.includes("do not")) return "Do Not Contact";
  return "New";
}

type OwnerMap = Map<string, string>;
async function buildOwnerMap(): Promise<OwnerMap> {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  const m: OwnerMap = new Map();
  for (const u of users) {
    if (u.email) m.set(u.email.toLowerCase(), u.id);
    m.set(u.name.toLowerCase(), u.id);
    m.set(u.name.split(" ")[0].toLowerCase(), u.id); // first name
  }
  return m;
}
function resolveOwner(map: OwnerMap, raw: string): string | undefined {
  const s = raw.toLowerCase().trim();
  if (!s) return undefined;
  return map.get(s) ?? map.get(s.split(" ")[0]) ?? undefined;
}

// Stable, collision-free clientId for an imported company: prefer the HubSpot
// Record ID (unique & lets re-runs dedupe); else a random fallback.
function companyClientId(r: Record<string, string>): string {
  const rid = pick(r, "record id", "company id", "hs object id", "id");
  return rid ? `HS-${rid}` : `HS-${Math.random().toString(36).slice(2, 11)}`;
}

// ── Wipe (pre-migration reset) ──────────────────────────────────────────────
// Clears ALL current CRM records so real HubSpot data starts clean. Destructive
// — the UI requires the admin to type a confirmation first.
export async function wipeCrmAction(confirm: string): Promise<{ ok: boolean; cleared: string[] }> {
  await guardAdmin();
  if (confirm !== "DELETE") throw new Error("confirmation required");
  const cleared: string[] = [];
  const run = async (label: string, fn: () => Promise<unknown>) => { try { await fn(); cleared.push(label); } catch { /* table may not exist / already empty */ } };

  // Dependents first, then parents (companies cascade contacts/deals/calls).
  await run("whatsAppMessage", () => prisma.whatsAppMessage.deleteMany());
  await run("emailMessage", () => prisma.emailMessage.deleteMany());
  await run("callLog", () => prisma.callLog.deleteMany());
  await run("activity", () => prisma.activity.deleteMany());
  await run("task", () => prisma.task.deleteMany());
  await run("cadenceStepRun", () => prisma.cadenceStepRun.deleteMany());
  await run("cadenceMembership", () => prisma.cadenceMembership.deleteMany());
  await run("salesMeeting", () => prisma.salesMeeting.deleteMany());
  await run("fulfilment", () => prisma.fulfilment.deleteMany());
  await run("quoteLineItem", () => prisma.quoteLineItem.deleteMany());
  await run("quote", () => prisma.quote.deleteMany());
  await run("deal", () => prisma.deal.deleteMany());
  await run("contact", () => prisma.contact.deleteMany());
  await run("company", () => prisma.company.deleteMany());

  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { ok: true, cleared };
}

// ── Companies import ─────────────────────────────────────────────────────────
export async function importCompaniesChunk(rows: Record<string, string>[]): Promise<{ created: number; skipped: number }> {
  await guardAdmin();
  const owners = await buildOwnerMap();

  const mapped = rows.map((r) => {
    const name = pick(r, "company name", "name", "company");
    if (!name) return null;
    const employees = parseInt(pick(r, "number of employees", "employees"), 10);
    return {
      clientId: companyClientId(r),
      name,
      domain: pick(r, "company domain name", "domain", "website url", "website") || null,
      phone: pick(r, "phone number", "phone") || null,
      country: pick(r, "country/region", "country") || null,
      state: pick(r, "state/region", "state") || null,
      region: pick(r, "region") || null,
      numberEmployees: Number.isFinite(employees) ? employees : null,
      type: pick(r, "type", "company type") || "Wholesaler",
      tier: pick(r, "tier") || "B",
      leadStatus: mapLeadStatus(pick(r, "lead status", "lifecycle stage", "status")),
      source: "HubSpot",
      ownerId: resolveOwner(owners, pick(r, "company owner", "owner", "hubspot owner")) ?? null,
      ownerAssignedAt: new Date(),
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  if (!mapped.length) return { created: 0, skipped: 0 };

  // Dedupe within the chunk + against existing clientIds.
  const seen = new Set<string>();
  const uniqueRows = mapped.filter((m) => (seen.has(m.clientId) ? false : (seen.add(m.clientId), true)));
  const existing = await prisma.company.findMany({ where: { clientId: { in: uniqueRows.map((m) => m.clientId) } }, select: { clientId: true } });
  const have = new Set(existing.map((e) => e.clientId));
  const toCreate = uniqueRows.filter((m) => !have.has(m.clientId));

  const res = await prisma.company.createMany({ data: toCreate, skipDuplicates: true });
  return { created: res.count, skipped: mapped.length - res.count };
}

// ── Contacts import ──────────────────────────────────────────────────────────
let unassignedId: string | null = null;
async function getUnassignedCompany(ownerId: string): Promise<string> {
  if (unassignedId) return unassignedId;
  const existing = await prisma.company.findFirst({ where: { name: "Unassigned (HubSpot import)" } });
  if (existing) { unassignedId = existing.id; return existing.id; }
  const c = await prisma.company.create({ data: { clientId: `HS-UNASSIGNED`, name: "Unassigned (HubSpot import)", leadStatus: "New", source: "HubSpot", ownerId } }).catch(async () => {
    return prisma.company.findFirstOrThrow({ where: { name: "Unassigned (HubSpot import)" } });
  });
  unassignedId = c.id;
  return c.id;
}

export async function importContactsChunk(rows: Record<string, string>[]): Promise<{ created: number; skipped: number }> {
  const user = await guardAdmin();

  const mapped = rows.map((r) => {
    const name = (pick(r, "name", "contact name") || `${pick(r, "first name")} ${pick(r, "last name")}`).trim();
    if (!name) return null;
    return {
      name,
      email: pick(r, "email", "email address") || null,
      phone: pick(r, "phone number", "phone", "mobile phone number") || null,
      title: pick(r, "job title", "title", "role") || null,
      companyExtId: pick(r, "associated company id", "primary associated company id", "associated company ids"),
      companyName: pick(r, "associated company", "company name", "company"),
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  if (!mapped.length) return { created: 0, skipped: 0 };

  // Resolve companies referenced in this chunk (by HubSpot id → our HS-<id>
  // clientId, else by name).
  const clientIds = mapped.map((m) => (m.companyExtId ? `HS-${m.companyExtId}` : "")).filter(Boolean);
  const names = mapped.map((m) => m.companyName).filter(Boolean);
  const companies = await prisma.company.findMany({
    where: { OR: [{ clientId: { in: clientIds } }, { name: { in: names } }] },
    select: { id: true, clientId: true, name: true },
  });
  const byClientId = new Map(companies.map((c) => [c.clientId, c.id]));
  const byName = new Map(companies.map((c) => [c.name.toLowerCase(), c.id]));

  // Skip contacts whose email already exists (dedupe / re-run safe).
  const emails = mapped.map((m) => m.email).filter(Boolean) as string[];
  const existing = emails.length ? await prisma.contact.findMany({ where: { email: { in: emails } }, select: { email: true } }) : [];
  const have = new Set(existing.map((e) => (e.email ?? "").toLowerCase()));

  let fallbackCompany: string | null = null;
  const toCreate: { name: string; email: string | null; phone: string | null; title: string | null; companyId: string }[] = [];
  const seenEmail = new Set<string>();
  for (const m of mapped) {
    if (m.email) {
      const k = m.email.toLowerCase();
      if (have.has(k) || seenEmail.has(k)) continue;
      seenEmail.add(k);
    }
    let companyId = (m.companyExtId && byClientId.get(`HS-${m.companyExtId}`)) || byName.get(m.companyName.toLowerCase());
    if (!companyId) { fallbackCompany = fallbackCompany ?? (await getUnassignedCompany(user.id)); companyId = fallbackCompany; }
    toCreate.push({ name: m.name, email: m.email, phone: m.phone, title: m.title, companyId });
  }

  const res = await prisma.contact.createMany({ data: toCreate, skipDuplicates: true });
  return { created: res.count, skipped: mapped.length - res.count };
}
