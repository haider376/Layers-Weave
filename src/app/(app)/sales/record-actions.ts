"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessSales, canReassignOwner } from "@/lib/permissions";
import { automationBookMeeting } from "@/lib/automations";

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
  if (!input.subject.trim() && !input.body.trim()) return;
  await prisma.emailMessage.create({
    data: { direction: "outbound", subject: input.subject.trim() || "(no subject)", body: input.body.trim(), fromAddr: user.email, toAddr: input.toAddr || "client@example.com", companyId: input.companyId, dealId: input.dealId, contactId: input.contactId },
  });
  await prisma.company.update({ where: { id: input.companyId }, data: { lastContacted: new Date() } });
  bump(input.companyId);
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
    prisma.callLog.findMany({ where: { dealId: id }, orderBy: { createdAt: "desc" }, take: 4 }),
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
