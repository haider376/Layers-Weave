// Exercises the automation chain (spec §8) directly against the DB.
import { prisma } from "../src/lib/db";
import {
  automationBookMeeting,
  automationMeetingStatus,
  automationMeetingOutcome,
  automationDealStage,
  automationFulfilmentStage,
  automationRecomputeUnits,
} from "../src/lib/automations";
import { deriveOrderType } from "../src/lib/permissions";

const results: { name: string; pass: boolean }[] = [];
const check = (name: string, pass: boolean) => results.push({ name, pass });

async function main() {
  // Set up a throwaway company.
  const company = await prisma.company.create({
    data: { clientId: `T-${Date.now()}`, name: `Test Co ${Date.now()}`, country: "United Kingdom" },
  });

  // #1 — book meeting creates Deal @ Appointment Scheduled + Sales Meeting together.
  const { deal, meeting } = await automationBookMeeting({ companyId: company.id });
  check("#1 deal opened @ Appointment Scheduled", deal.stage === "Appointment Scheduled");
  check("#1 sales meeting created in same step", !!meeting && meeting.dealId === deal.id);

  // #2 — meeting Showed up syncs deal stage.
  await automationMeetingStatus(meeting.id, "Showed up");
  let d = await prisma.deal.findUniqueOrThrow({ where: { id: deal.id } });
  check("#2 deal synced to Showed up", d.stage === "Showed up");

  // #4 — Requested a Quote → deal Initiation + LQ-##### quote created.
  const { quoteId } = await automationMeetingOutcome(meeting.id, "Requested a Quote");
  d = await prisma.deal.findUniqueOrThrow({ where: { id: deal.id }, include: { quotes: true } as any });
  check("#4 deal advanced to Initiation", d.stage === "Initiation");
  check("#4 quote id matches LQ-##### format", !!quoteId && /^LQ-\d{5}$/.test(quoteId));
  const quote = await prisma.quote.findUniqueOrThrow({ where: { quoteId: quoteId! }, include: { items: true, bulkDetail: true } });
  check("#5 Bulk detail auto-created (routing)", !!quote.bulkDetail);

  // Add quantity to the quote line, recompute units (#9).
  await prisma.quoteLineItem.update({ where: { id: quote.items[0].id }, data: { quantity: 2500, targetPrice: 5 } });
  const recomputed = await automationRecomputeUnits(quote.id);
  check("#9 order type derived from units (2500 → LCL)", recomputed.orderType === "LCL" && deriveOrderType(2500) === "LCL");

  // #6 — Closed Won creates a Fulfilment + notifies Supply/Logistics.
  await automationDealStage(deal.id, "Closed Won");
  const ful = await prisma.fulfilment.findFirst({ where: { quoteId: quote.id } });
  check("#6 fulfilment auto-created on Closed Won", !!ful);
  check("#6 fulfilment order type auto-derived (LCL)", ful?.orderType === "LCL");
  const notifs = await prisma.notification.count({ where: { audience: { in: ["Supply", "Logistics"] } } });
  check("#6 Supply + Logistics notified", notifs >= 2);

  // #7 — Delivered notifies the client + closes the clock.
  await automationFulfilmentStage(ful!.id, "Delivered");
  const ful2 = await prisma.fulfilment.findUniqueOrThrow({ where: { id: ful!.id } });
  check("#7 delivered date set", !!ful2.deliveredDate);
  check("#7 client notified flag set", ful2.notifiedClient === true);
  const clientNotif = await prisma.notification.findFirst({ where: { audience: "Client", body: { contains: quoteId! } } });
  check("#7 client notification created", !!clientNotif);

  // cleanup
  await prisma.company.delete({ where: { id: company.id } });

  let failed = 0;
  for (const r of results) {
    console.log(`${r.pass ? "✅" : "❌"}  ${r.name}`);
    if (!r.pass) failed++;
  }
  console.log(`\n${results.length - failed}/${results.length} automation checks passed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
