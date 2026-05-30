"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import {
  automationBookMeeting,
  automationDealStage,
  automationMeetingStatus,
  automationMeetingOutcome,
} from "@/lib/automations";

async function guard() {
  const user = await requireUser();
  if (!canAccessSales(user.role)) throw new Error("FORBIDDEN");
  return user;
}

function revalidate() {
  revalidatePath("/sales");
  revalidatePath("/supply");
  revalidatePath("/logistics");
  revalidatePath("/dashboard");
}

// Automation #1 — book a meeting → creates Deal + Sales Meeting together.
export async function bookMeetingAction(clientName: string) {
  const user = await guard();
  const name = clientName.trim();
  if (!name) throw new Error("Client name required");

  let company = await prisma.company.findFirst({ where: { name } });
  if (!company) {
    let n = 0;
    let clientId = `C-${1000 + Math.floor(Math.random() * 9000)}`;
    while (await prisma.company.findUnique({ where: { clientId } })) {
      clientId = `C-${1000 + Math.floor(Math.random() * 9000)}`;
      if (++n > 50) break;
    }
    company = await prisma.company.create({
      data: { clientId, name, type: "Wholesaler", tier: "B", leadStatus: "Open Deal", ownerId: user.id },
    });
  }
  await automationBookMeeting({ companyId: company.id, aeId: user.id, meetingDate: new Date() });
  revalidate();
}

// Automation #2 / #3 — sync meeting status to the deal stage.
export async function setMeetingStatusAction(dealId: string, status: string) {
  await guard();
  const meeting = await prisma.salesMeeting.findFirst({
    where: { dealId },
    orderBy: { bookedDate: "desc" },
  });
  if (!meeting) throw new Error("No meeting on this deal");
  await automationMeetingStatus(meeting.id, status);
  revalidate();
}

// Automation #4 — Requested a Quote → Deal → Initiation AND create the LQ-##### quote.
export async function requestQuoteAction(dealId: string) {
  await guard();
  let meeting = await prisma.salesMeeting.findFirst({
    where: { dealId },
    orderBy: { bookedDate: "desc" },
  });
  if (!meeting) {
    // Defensive: a deal should always have a meeting, but create one if missing.
    const deal = await prisma.deal.findUniqueOrThrow({ where: { id: dealId }, include: { company: true } });
    meeting = await prisma.salesMeeting.create({
      data: { title: `${deal.company.name} × Layers`, status: "Showed up", dealId, aeId: deal.ownerId },
    });
  }
  const res = await automationMeetingOutcome(meeting.id, "Requested a Quote");
  revalidate();
  return { quoteId: res.quoteId ?? null };
}

// Move a deal between stages (drag & drop). Closed Won → fulfilment auto-creation (#6).
export async function moveDealAction(dealId: string, stage: string) {
  await guard();
  await automationDealStage(dealId, stage);
  revalidate();
}
