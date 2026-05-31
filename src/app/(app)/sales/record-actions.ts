"use server";

import { revalidatePath } from "next/cache";
import { prisma, safe } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessSales, canReassignOwner } from "@/lib/permissions";
import { automationBookMeeting } from "@/lib/automations";
import { getConnection, sendGmail } from "@/lib/google";

async function guard() {
  const user = await requireUser();
  if (!canAccessSales(user.role)) throw new Error("FORBIDDEN");
  return user;
}

function bump(companyId?: string) {
  revalidatePath("/companies");
  revalidatePath("/contacts");
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  if (companyId) revalidatePath(`/companies/${companyId}`);
}

// ── Company / Contact edits ──
export async function updateCompanyAction(companyId: string, data: Record<string, string>) {
  await guard();
  const allowed = ["name", "domain", "type", "tier", "leadStatus", "country", "phone", "email", "aiNotes"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in data) patch[k] = data[k] || null;
  await prisma.company.update({ where: { id: companyId }, data: patch });
  bump(companyId);
}

export async function updateContactAction(contactId: string, data: Record<string, string>) {
  await guard();
  const allowed = ["name", "title", "email", "phone"];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in data) patch[k] = data[k] || null;
  const c = await prisma.contact.update({ where: { id: contactId }, data: patch });
  bump(c.companyId);
}

// Reassign AE / BDR owner — restricted (CRM specialist, manager, CRO, Rija).
export async function setCompanyOwnerAction(companyId: string, field: "ownerId" | "bdrId", userId: string) {
  const user = await requireUser();
  if (!canReassignOwner(user.role)) throw new Error("FORBIDDEN");
  await prisma.company.update({ where: { id: companyId }, data: { [field]: userId || null } });
  bump(companyId);
}

export async function addContactAction(companyId: string, name: string) {
  await guard();
  await prisma.contact.create({ data: { name: name.trim() || "New contact", companyId } });
  bump(companyId);
}

async function uniqueClientId() {
  for (let i = 0; i < 50; i++) {
    const id = `C-${1000 + Math.floor(Math.random() * 9000)}`;
    if (!(await prisma.company.findUnique({ where: { clientId: id } }))) return id;
  }
  return `C-${Date.now()}`;
}

// Create a Lead (company)
export async function createLeadAction(input: { name: string; country?: string; type?: string; leadStatus?: string; tier?: string }) {
  const user = await guard();
  const c = await prisma.company.create({
    data: {
      clientId: await uniqueClientId(), name: input.name.trim() || "New lead",
      country: input.country || null, type: input.type || "Wholesaler", tier: input.tier || "B",
      leadStatus: input.leadStatus || "New", ownerId: user.id, ownerAssignedAt: new Date(),
    },
  });
  bump(c.id);
  return { id: c.id };
}

// Create a Person (contact)
export async function createPersonAction(input: { name: string; companyId: string; title?: string; email?: string; phone?: string; primary?: boolean }) {
  await guard();
  const c = await prisma.contact.create({
    data: { name: input.name.trim() || "New person", companyId: input.companyId, title: input.title || null, email: input.email || null, phone: input.phone || null, primary: !!input.primary },
  });
  bump(input.companyId);
  revalidatePath(`/contacts/${c.id}`);
  return { id: c.id };
}

// Bulk CSV import — Leads
export async function importLeadsAction(rows: { name: string; country?: string; leadStatus?: string; type?: string; tier?: string }[]) {
  const user = await guard();
  let n = 0;
  for (const r of rows.slice(0, 1000)) {
    if (!r.name?.trim()) continue;
    await prisma.company.create({
      data: { clientId: await uniqueClientId(), name: r.name.trim(), country: r.country || null, type: r.type || "Wholesaler", tier: r.tier || "B", leadStatus: r.leadStatus || "New", ownerId: user.id, ownerAssignedAt: new Date() },
    });
    n++;
  }
  revalidatePath("/companies");
  return { imported: n };
}

// Bulk CSV import — People (matches/creates company by name)
export async function importPeopleAction(rows: { name: string; email?: string; phone?: string; title?: string; company?: string }[]) {
  const user = await guard();
  let n = 0;
  for (const r of rows.slice(0, 1000)) {
    if (!r.name?.trim()) continue;
    const cname = (r.company || "Unassigned").trim();
    const existing = await prisma.company.findFirst({ where: { name: cname } });
    const companyId = existing ? existing.id : (await prisma.company.create({ data: { clientId: await uniqueClientId(), name: cname, leadStatus: "New", ownerId: user.id, ownerAssignedAt: new Date() } })).id;
    await prisma.contact.create({ data: { name: r.name.trim(), email: r.email || null, phone: r.phone || null, title: r.title || null, companyId } });
    n++;
  }
  revalidatePath("/contacts");
  return { imported: n };
}

// ── Timeline composers ──
export async function logNoteAction(input: { companyId: string; dealId?: string; contactId?: string; body: string }) {
  const user = await guard();
  if (!input.body.trim()) return;
  await prisma.activity.create({
    data: { kind: "sale", type: "note", body: input.body.trim(), actor: user.name, companyId: input.companyId, dealId: input.dealId, contactId: input.contactId },
  });
  await prisma.company.update({ where: { id: input.companyId }, data: { lastContacted: new Date() } });
  bump(input.companyId);
}

export async function sendEmailAction(input: { companyId: string; dealId?: string; contactId?: string; toAddr: string; subject: string; body: string }) {
  const user = await guard();
  if (!input.subject.trim() && !input.body.trim()) return { sentVia: "none" as const };

  // If the rep has connected Google (Gmail scope), actually send the email from
  // their own account; otherwise just log it as an outbound touch.
  let sentVia: "gmail" | "logged" = "logged";
  let deliveryError: string | undefined;
  const conn = await getConnection(user.id).catch(() => ({ connected: false, accountEmail: null }));
  if (conn.connected && input.toAddr && /\S+@\S+\.\S+/.test(input.toAddr)) {
    const htmlBody = input.body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    const r = await sendGmail(user.id, { to: input.toAddr, subject: input.subject.trim() || "(no subject)", body: htmlBody, fromName: user.name });
    if (r.ok) sentVia = "gmail"; else deliveryError = r.error;
  }

  await prisma.emailMessage.create({
    data: { direction: "outbound", subject: input.subject.trim() || "(no subject)", body: input.body.trim(), fromAddr: conn.accountEmail || user.email, toAddr: input.toAddr || "client@example.com", companyId: input.companyId, dealId: input.dealId, contactId: input.contactId },
  });
  await prisma.activity.create({ data: { kind: "sale", type: "email", body: `${sentVia === "gmail" ? "Email sent via Gmail" : "Email logged"}: ${input.subject.trim() || "(no subject)"}`, actor: user.name, companyId: input.companyId, dealId: input.dealId, contactId: input.contactId } });
  await prisma.company.update({ where: { id: input.companyId }, data: { lastContacted: new Date() } });
  bump(input.companyId);
  return { sentVia, error: deliveryError };
}

// Click-to-call (Zoom Phone) — two-step disposition: connected + sentiment.
export async function logCallAction(input: { companyId: string; dealId?: string; contactId: string; number: string; connected: boolean; sentiment: string; notes?: string }) {
  const user = await guard();
  await prisma.callLog.create({
    data: {
      contactId: input.contactId, companyId: input.companyId, dealId: input.dealId, number: input.number || "—",
      via: "Zoom Phone", connected: input.connected, outcome: input.sentiment, notes: input.notes,
      agent: user.name, durationSec: input.connected ? 60 + Math.floor(Math.random() * 400) : 12,
    },
  });
  // SQL booked from a call → also create a meeting + open deal (auto-handoff #1).
  if (input.sentiment === "SQL Booked") {
    await prisma.activity.create({ data: { kind: "sale", type: "system", body: `SQL booked on a call with ${user.name}`, actor: user.name, companyId: input.companyId, dealId: input.dealId, contactId: input.contactId } });
  }
  await prisma.company.update({ where: { id: input.companyId }, data: { lastContacted: new Date() } });
  bump(input.companyId);
}

export async function bookMeetingForCompanyAction(companyId: string) {
  const user = await guard();
  await automationBookMeeting({ companyId, aeId: user.id, meetingDate: new Date() });
  bump(companyId);
  return { ok: true };
}

// ── Deal create / edit ──
export async function createDealAction(input: { name: string; companyId: string; contactId?: string; amount: number; stage: string; requestType?: string }) {
  const user = await guard();
  const deal = await prisma.deal.create({
    data: {
      dealId: `D-${Math.floor(100000 + Math.random() * 900000)}`,
      name: input.name.trim() || "New deal",
      companyId: input.companyId,
      contactId: input.contactId || null,
      amount: input.amount || 500,
      stage: input.stage || "Appointment Scheduled",
      requestType: input.requestType || null,
      ownerId: user.id,
    },
  });
  bump(input.companyId);
  revalidatePath(`/deals/${deal.id}`);
  return { id: deal.id };
}

// Compact deal payload for the slide-over drawer (peek without navigating).
export async function getDealDrawerAction(id: string) {
  await guard();
  const d = await prisma.deal.findUnique({
    where: { id },
    include: { company: true, contact: true, owner: true, quotes: { select: { quoteId: true, status: true, type: true } } },
  });
  if (!d) return null;
  const [activities, calls, emails] = await Promise.all([
    prisma.activity.findMany({ where: { dealId: id }, orderBy: { createdAt: "desc" }, take: 6 }),
    safe(prisma.callLog.findMany({ where: { dealId: id }, orderBy: { createdAt: "desc" }, take: 4 }), []),
    prisma.emailMessage.findMany({ where: { dealId: id }, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);
  const events = [
    ...activities.map((a) => ({ kind: a.type === "note" ? "note" : "system", text: a.body, at: a.createdAt.toISOString() })),
    ...calls.map((c) => ({ kind: "call", text: `Call — ${c.outcome ?? "logged"}`, at: c.createdAt.toISOString() })),
    ...emails.map((e) => ({ kind: "email", text: `${e.direction === "outbound" ? "Sent" : "Received"}: ${e.subject}`, at: e.createdAt.toISOString() })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8);

  return {
    id: d.id, dealId: d.dealId, name: d.name.replace(/ × Layers$/, ""), stage: d.stage, amount: d.amount,
    requestType: d.requestType ?? "", company: { id: d.companyId, name: d.company.name },
    contact: d.contact ? { id: d.contact.id, name: d.contact.name } : null,
    owner: d.owner?.name ?? "—", quotes: d.quotes, events,
  };
}

async function recentEvents(where: { companyId?: string; contactId?: string }) {
  const [activities, calls, emails] = await Promise.all([
    prisma.activity.findMany({ where, orderBy: { createdAt: "desc" }, take: 6 }),
    safe(prisma.callLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 4 }), []),
    prisma.emailMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);
  return [
    ...activities.filter((a) => a.type !== "call" && a.type !== "email").map((a) => ({ kind: a.type === "note" ? "note" : "system", text: a.body, at: a.createdAt.toISOString() })),
    ...calls.map((c) => ({ kind: "call", text: `Call — ${c.outcome ?? "logged"}`, at: c.createdAt.toISOString() })),
    ...emails.map((e) => ({ kind: "email", text: `${e.direction === "outbound" ? "Sent" : "Received"}: ${e.subject}`, at: e.createdAt.toISOString() })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8);
}

export async function getCompanyDrawerAction(id: string) {
  await guard();
  const c = await prisma.company.findUnique({
    where: { id },
    include: { owner: true, bdr: true, contacts: { take: 6 }, deals: { orderBy: { createDate: "desc" }, take: 6 } },
  });
  if (!c) return null;
  return {
    id: c.id, name: c.name, clientId: c.clientId, leadStatus: c.leadStatus, tier: c.tier ?? "—",
    type: c.type ?? "—", country: c.country ?? "—", owner: c.owner?.name ?? "—", bdr: c.bdr?.name ?? "—",
    contacts: c.contacts.map((x) => ({ id: x.id, name: x.name, title: x.title ?? "" })),
    deals: c.deals.map((d) => ({ id: d.id, name: d.name.replace(/ × Layers$/, ""), stage: d.stage, amount: d.amount })),
    events: await recentEvents({ companyId: id }),
  };
}

export async function getContactDrawerAction(id: string) {
  await guard();
  const c = await prisma.contact.findUnique({ where: { id }, include: { company: true, deals: { take: 6 } } });
  if (!c) return null;
  return {
    id: c.id, name: c.name, title: c.title ?? "—", email: c.email ?? "—", phone: c.phone ?? "—", primary: c.primary,
    company: { id: c.companyId, name: c.company.name },
    deals: c.deals.map((d) => ({ id: d.id, name: d.name.replace(/ × Layers$/, ""), stage: d.stage, amount: d.amount })),
    events: await recentEvents({ contactId: id }),
  };
}

export async function updateDealAction(dealId: string, data: { name?: string; amount?: number; stage?: string; requestType?: string; contactId?: string }) {
  await guard();
  const patch: Record<string, unknown> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.amount !== undefined) patch.amount = data.amount;
  if (data.stage !== undefined) patch.stage = data.stage;
  if (data.requestType !== undefined) patch.requestType = data.requestType || null;
  if (data.contactId !== undefined) patch.contactId = data.contactId || null;
  const deal = await prisma.deal.update({ where: { id: dealId }, data: patch });
  bump(deal.companyId);
  revalidatePath(`/deals/${dealId}`);
}
