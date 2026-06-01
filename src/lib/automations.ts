// Automation triggers (spec §8). These are the rules that keep one record
// threaded across Sales → Supply → Logistics with no manual double-entry.
import { prisma } from "./db";
import { generateQuoteId } from "./quoteId";
import { deriveOrderType } from "./permissions";
import { notifyDealWon } from "./slack";

async function logActivity(kind: string, body: string, actor?: string, quoteRef?: string) {
  await prisma.activity.create({ data: { kind, body, actor, quoteRef } });
}

async function notify(audience: string, body: string) {
  await prisma.notification.create({ data: { audience, body } });
}

function totalUnits(items: { quantity: number }[]) {
  return items.reduce((s, i) => s + (i.quantity || 0), 0);
}

// #1 — Meeting booked (SQL): create Deal @ Appointment Scheduled AND Sales Meeting in one step.
export async function automationBookMeeting(input: {
  companyId: string;
  meetingDate?: Date | null;
  aeId?: string | null;
  bdrId?: string | null;
  googleMeetUrl?: string | null;
}) {
  const company = await prisma.company.findUniqueOrThrow({ where: { id: input.companyId } });
  const deal = await prisma.deal.create({
    data: {
      dealId: `D-${Math.floor(100000 + Math.random() * 900000)}`,
      name: `${company.name} × Layers`,
      stage: "Appointment Scheduled",
      companyId: company.id,
      ownerId: input.aeId ?? company.ownerId,
      bdrId: input.bdrId ?? company.bdrId,
    },
  });
  const meeting = await prisma.salesMeeting.create({
    data: {
      title: `${company.name} × Layers`,
      status: "Booked",
      meetingDate: input.meetingDate ?? null,
      googleMeetUrl: input.googleMeetUrl ?? null,
      dealId: deal.id,
      aeId: input.aeId ?? company.ownerId,
      bdrId: input.bdrId ?? company.bdrId,
    },
  });
  await logActivity("sale", `Meeting booked — ${company.name}, deal opened @ Appointment Scheduled`, "BDR");
  return { deal, meeting };
}

// #2 / #3 — Meeting status changes sync the Deal stage (single source).
export async function automationMeetingStatus(meetingId: string, status: string) {
  const meeting = await prisma.salesMeeting.update({
    where: { id: meetingId },
    data: { status },
    include: { deal: { include: { company: true } } },
  });
  let newStage: string | null = null;
  if (status === "Showed up") newStage = "Showed up";
  else if (status === "No Show") newStage = "No Show / Reschedule";
  else if (status === "Unqualified") newStage = "Disqualified";
  if (newStage) {
    await prisma.deal.update({ where: { id: meeting.dealId }, data: { stage: newStage } });
    await logActivity("sale", `${meeting.deal.company.name} — meeting ${status}, deal → ${newStage}`);
  }
  return meeting;
}

// #4 — Outcome = "Requested a Quote": Deal → Initiation AND create Quote in master tracker.
export async function automationMeetingOutcome(meetingId: string, outcome: string) {
  const meeting = await prisma.salesMeeting.update({
    where: { id: meetingId },
    data: { outcome },
    include: { deal: { include: { company: true, quotes: true } } },
  });

  if (outcome === "Requested a Quote") {
    await prisma.deal.update({
      where: { id: meeting.dealId },
      data: { stage: "Initiation", requestType: meeting.deal.requestType ?? "Bulk" },
    });
    // Only create a quote if the deal doesn't already have one.
    if (meeting.deal.quotes.length === 0) {
      const quoteId = await generateQuoteId();
      const quote = await prisma.quote.create({
        data: {
          quoteId,
          type: "Bulk",
          status: "In Progress",
          clientName: meeting.deal.company.name,
          clientCountry: meeting.deal.company.country,
          dealId: meeting.dealId,
          ownerId: meeting.deal.ownerId,
          items: { create: [{ item: "", quantity: 0, targetPrice: 0, position: 0 }] },
        },
      });
      await automationSetQuoteType(quote.id, "Bulk"); // #5 routing
      await logActivity("sale", `Quote ${quoteId} created — ${meeting.deal.company.name} requested a quote`, undefined, quoteId);
      return { meeting, quoteId };
    }
  }
  return { meeting };
}

// #5 — Quote type set: route to Bulk detail OR Handpick detail automatically.
export async function automationSetQuoteType(quoteId: string, type: "Bulk" | "Handpick") {
  const quote = await prisma.quote.update({ where: { id: quoteId }, data: { type } });
  if (type === "Bulk") {
    await prisma.handpickDetail.deleteMany({ where: { quoteId } });
    await prisma.bulkDetail.upsert({
      where: { quoteId },
      create: { quoteId, grade: "A" },
      update: {},
    });
  } else {
    await prisma.bulkDetail.deleteMany({ where: { quoteId } });
    await prisma.handpickDetail.upsert({
      where: { quoteId },
      create: { quoteId, status: "Curating" },
      update: {},
    });
  }
  return quote;
}

// #6 — Deal = Closed Won: create Fulfilment record, notify Supply + Logistics.
export async function automationDealStage(dealId: string, stage: string) {
  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: {
      stage,
      closeDate: stage === "Closed Won" || stage === "Closed Lost" ? new Date() : undefined,
    },
    include: { quotes: { include: { items: true, fulfilment: true } }, company: true, owner: true },
  });

  if (stage === "Closed Won") {
    // Slack deal-won alert (best-effort — never blocks the close).
    notifyDealWon({
      company: deal.company.name,
      amount: deal.amount,
      owner: deal.owner?.name ?? null,
      quoteId: deal.quotes[0]?.quoteId ?? null,
      dealName: deal.name,
    }).catch(() => {});

    for (const quote of deal.quotes) {
      await prisma.quote.update({ where: { id: quote.id }, data: { status: "Closed/Won" } });
      if (!quote.fulfilment) {
        const units = totalUnits(quote.items);
        await prisma.fulfilment.create({
          data: {
            quoteId: quote.id,
            orderStage: "Preparing",
            orderType: deriveOrderType(units), // #9
            totalUnits: units,
            raghouseId: quote.raghouseId,
            consigneeAddress: deal.company.country ?? undefined,
          },
        });
      }
      await notify("Supply", `Deal won — prepare ${quote.quoteId} for fulfilment`);
      await notify("Logistics", `New fulfilment ${quote.quoteId} (${deriveOrderType(totalUnits(quote.items))})`);
      await logActivity("sale", `Deal won — ${quote.quoteId} closed`, undefined, quote.quoteId);
    }
  }
  return deal;
}

// #7 — Order Stage = Delivered: auto-notify client; close lead-time clock.
export async function automationFulfilmentStage(fulfilmentId: string, orderStage: string) {
  const data: Record<string, unknown> = { orderStage };
  if (orderStage === "Delivered") {
    data.deliveredDate = new Date();
    data.notifiedClient = true;
  }
  const ful = await prisma.fulfilment.update({
    where: { id: fulfilmentId },
    data,
    include: { quote: true },
  });
  if (orderStage === "Delivered") {
    await prisma.quote.update({ where: { id: ful.quoteId }, data: { status: "Delivered" } });
    await notify("Client", `Your order ${ful.quote.quoteId} has been delivered.`);
    await logActivity("ship", `${ful.quote.quoteId} delivered — client notified`, undefined, ful.quote.quoteId);
  }
  return ful;
}

// #9 — Total units set on a quote: re-derive Order Type on any linked fulfilment.
export async function automationRecomputeUnits(quoteId: string) {
  const quote = await prisma.quote.findUniqueOrThrow({
    where: { id: quoteId },
    include: { items: true, fulfilment: true },
  });
  const units = totalUnits(quote.items);
  if (quote.fulfilment) {
    await prisma.fulfilment.update({
      where: { id: quote.fulfilment.id },
      data: { totalUnits: units, orderType: deriveOrderType(units) },
    });
  }
  return { units, orderType: deriveOrderType(units) };
}
