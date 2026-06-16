import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const DEFAULT_PASSWORD = "password";

// §6 roster — role strings match src/lib/permissions.ts Role type.
const USERS = [
  { email: "oliver@layerswholesale.co", name: "Oliver Bennett", role: "CEO", title: "Chief Executive Officer" },
  { email: "haider@layerswholesale.co", name: "Haider Ali Rana", role: "CRO", title: "Chief Revenue Officer" },
  { email: "zikriya@layerswholesale.co", name: "Zikriya Abbasi", role: "Sales Manager", title: "Sales Manager" },
  { email: "rija@layerswholesale.co", name: "Rija Fatima", role: "AE/QA", title: "Account Executive / QA" },
  { email: "kamila@layerswholesale.co", name: "Kamila Batool", role: "AE", title: "Account Executive" },
  { email: "asjad@layerswholesale.co", name: "Asjad Malik", role: "AE", title: "Account Executive" },
  { email: "adan@layerswholesale.co", name: "Adan Khalid", role: "AE", title: "Account Executive" },
  { email: "huzaifa@layerswholesale.co", name: "Huzaifa Asad", role: "BDR", title: "Business Development Rep" },
  { email: "fatima@layerswholesale.co", name: "Fatima Khan", role: "BDR", title: "Business Development Rep" },
  { email: "haya@layerswholesale.co", name: "Hayaa Malik", role: "BDR", title: "Business Development Rep" },
  { email: "shahzaib@layerswholesale.co", name: "Shahzaib Rana", role: "Lead Gen/CRM", title: "Lead Gen / CRM" },
];

const RAGHOUSES = [
  { name: "Italian Dreams", region: "Italy", reliability: 92 },
  { name: "Imperial", region: "Pakistan", reliability: 88 },
  { name: "Global Bags", region: "Pakistan", reliability: 81 },
  { name: "Thrift Kings", region: "UK", reliability: 85 },
  { name: "Greens International", region: "Pakistan", reliability: 79 },
  { name: "Vintage Wholesale Collection", region: "Italy", reliability: 90 },
];

const CARRIERS = [
  { name: "Expost", mode: "3PL", onTime: 94 },
  { name: "ECL", mode: "3PL", onTime: 91 },
  { name: "Rapidex", mode: "3PL", onTime: 88 },
  { name: "DPD", mode: "Last mile", onTime: 96 },
  { name: "UPS", mode: "Last mile", onTime: 95 },
  { name: "Van Delivery", mode: "Last mile", onTime: 90 },
];

// Kanban deals (name, ownerEmail, amount, stage, quoteId?)
const DEALS: Array<[string, string, number, string, string?]> = [
  ["Christopher Drakes", "rija", 500, "Appointment Scheduled"],
  ["Edvin Sunbring", "kamila", 500, "Appointment Scheduled"],
  ["Niamh Rothwell", "asjad", 500, "Appointment Scheduled"],
  ["Ailis Mcginn", "rija", 500, "Showed up"],
  ["Victor Regis", "kamila", 500, "Showed up"],
  ["Tara Awodanga", "asjad", 500, "Showed up"],
  ["Billy Wilson", "adan", 500, "No Show / Reschedule"],
  ["Rachel Grady", "rija", 500, "No Show / Reschedule"],
  ["Proud Vintage", "kamila", 500, "Initiation", "LQ-71044"],
  ["Neal · Better With Age", "adan", 500, "Initiation", "LQ-22581"],
  ["Malek Aliwan", "rija", 500, "Initiation", "LQ-50431"],
  ["Livia Walled", "kamila", 500, "Initiation", "LQ-30912"],
  ["World Vintage Wholesale", "adan", 2431, "Closed Won", "LQ-48217"],
  ["Menace Vintage Ltd", "rija", 9252, "Closed Won", "LQ-19880"],
  ["Aimee Campbell", "kamila", 1934, "Closed Won", "LQ-67802"],
  ["Emma Bulkeley", "asjad", 500, "Closed Lost"],
  ["Christie Covers", "adan", 500, "Closed Lost"],
  ["Kiki", "adan", 500, "Disqualified"],
];

type Item = { item: string; qty: number; target: number };
const QUOTES: Array<{
  quoteId: string; client: string; type: "Bulk" | "Handpick"; grade?: string;
  raghouse: string; status: string; priority?: string; items: Item[];
}> = [
  { quoteId: "LQ-30912", client: "Livia Walled", type: "Bulk", grade: "A", raghouse: "Italian Dreams", status: "In Progress", priority: "High", items: [{ item: "Y2K hoodies", qty: 1200, target: 3.9 }] },
  { quoteId: "LQ-48217", client: "World Vintage Wholesale", type: "Bulk", grade: "A", raghouse: "Imperial", status: "Closed/Won", priority: "High", items: [{ item: "Carhartt jackets", qty: 240, target: 26.0 }] },
  { quoteId: "LQ-71044", client: "Proud Vintage", type: "Bulk", grade: "B", raghouse: "Global Bags", status: "In Progress", priority: "Medium", items: [{ item: "Mixed denim", qty: 800, target: 3.7 }, { item: "Carhartt jackets", qty: 120, target: 24.0 }] },
  { quoteId: "LQ-22581", client: "Neal · Better With Age", type: "Bulk", grade: "A", raghouse: "Thrift Kings", status: "In Progress", priority: "Medium", items: [{ item: "Patagonia fleece", qty: 300, target: 17.0 }] },
  { quoteId: "LQ-50431", client: "Malek Aliwan", type: "Handpick", raghouse: "Italian Dreams", status: "In Progress", priority: "Low", items: [{ item: "Y2K baby tees", qty: 60, target: 9.0 }, { item: "Levi 501s", qty: 40, target: 14.0 }] },
  { quoteId: "LQ-67802", client: "Aimee Campbell", type: "Handpick", raghouse: "Imperial", status: "Closed/Won", priority: "Medium", items: [{ item: "Carhartt jackets", qty: 50, target: 25.0 }, { item: "Band tees", qty: 80, target: 8.0 }] },
  { quoteId: "LQ-19880", client: "Menace Vintage Ltd", type: "Bulk", grade: "A", raghouse: "Vintage Wholesale Collection", status: "Delivered", priority: "High", items: [{ item: "Vintage knitwear", qty: 900, target: 11.0 }] },
  { quoteId: "LQ-33915", client: "Camden Thrift Co", type: "Bulk", grade: "A", raghouse: "Imperial", status: "Closed/Won", priority: "Medium", items: [{ item: "Branded windbreakers", qty: 620, target: 12.5 }] },
];

const SHIPS: Array<{
  quoteId: string; from: string; destination: string; carrier: string;
  orderStage: string; statusNote: string; eta: string; lastMile?: string;
}> = [
  { quoteId: "LQ-33915", from: "Karachi", destination: "London, UK", carrier: "Expost", orderStage: "Handed Over", statusNote: "on schedule", eta: "2026-06-02", lastMile: "DPD" },
  { quoteId: "LQ-30912", from: "Lahore", destination: "Manchester, UK", carrier: "ECL", orderStage: "Under Quality Check", statusNote: "consolidated order", eta: "2026-06-14", lastMile: "DPD" },
  { quoteId: "LQ-48217", from: "Karachi", destination: "Amsterdam, NL", carrier: "Rapidex", orderStage: "Handed Over", statusNote: "clearing customs", eta: "2026-06-01", lastMile: "UPS" },
  { quoteId: "LQ-71044", from: "Karachi", destination: "Berlin, DE", carrier: "Expost", orderStage: "Partially Closed", statusNote: "2 days overdue", eta: "2026-05-29", lastMile: "UPS" },
  { quoteId: "LQ-19880", from: "Lahore", destination: "Leeds, UK", carrier: "ECL", orderStage: "Delivered", statusNote: "signed for", eta: "2026-05-28", lastMile: "Van Delivery" },
];

const COUNTRY_BY_CLIENT: Record<string, string> = {
  "Livia Walled": "United Kingdom", "World Vintage Wholesale": "Netherlands",
  "Proud Vintage": "Germany", "Neal · Better With Age": "United Kingdom",
  "Malek Aliwan": "Jordan", "Aimee Campbell": "United Kingdom",
  "Menace Vintage Ltd": "United Kingdom", "Camden Thrift Co": "United Kingdom",
};

export async function seedDatabase(prisma: PrismaClient) {
  let clientCounter = 1000;
  const nextClientId = () => `C-${clientCounter++}`;

  // Order matters for FK constraints
  // Cadence tables may not exist on older databases — clear them defensively.
  try {
    await prisma.cadenceStepRun.deleteMany();
    await prisma.cadenceMembership.deleteMany();
    await prisma.cadenceStep.deleteMany();
    await prisma.cadence.deleteMany();
  } catch { /* tables not present yet */ }
  await prisma.callLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.priceApproval.deleteMany();
  await prisma.fulfilment.deleteMany();
  await prisma.bulkDetail.deleteMany();
  await prisma.handpickDetail.deleteMany();
  await prisma.quoteLineItem.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.salesMeeting.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.raghouse.deleteMany();
  await prisma.carrier.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const userByKey: Record<string, string> = {};
  for (const u of USERS) {
    const created = await prisma.user.create({ data: { ...u, passwordHash } });
    userByKey[u.email.split("@")[0]] = created.id;
  }

  const ragByName: Record<string, string> = {};
  for (const r of RAGHOUSES) {
    const created = await prisma.raghouse.create({ data: r });
    ragByName[r.name] = created.id;
  }
  const carrierByName: Record<string, string> = {};
  for (const c of CARRIERS) {
    const created = await prisma.carrier.create({ data: c });
    carrierByName[c.name] = created.id;
  }

  const dealByQuoteId: Record<string, string> = {};
  const companyByClient: Record<string, string> = {};
  const dealRows: { id: string; companyId: string; contactId: string; name: string; stage: string; ownerKey: string }[] = [];

  let _mtgIdx = 0;
  for (const [name, ownerKey, amount, stage, quoteId] of DEALS) {
    const country = COUNTRY_BY_CLIENT[name] ?? "United Kingdom";
    const company = await prisma.company.create({
      data: {
        clientId: nextClientId(),
        name,
        domain: `${name.toLowerCase().replace(/[^a-z]+/g, "")}.com`,
        type: "Wholesaler",
        tier: amount > 2000 ? "A" : "B",
        leadStatus: stage.startsWith("Closed Won") ? "Open Deal" : "In Progress",
        country,
        ownerId: userByKey[ownerKey],
        bdrId: userByKey["huzaifa"],
        source: "BDR Unenriched leads – UK.csv",
      },
    });
    companyByClient[name] = company.id;
    const contact = await prisma.contact.create({
      data: {
        name: `${name.split(" ")[0]} ${["Buyer", "Director", "Owner"][Math.floor(Math.random() * 3)]}`,
        title: ["Founder", "Head Buyer", "Owner", "Procurement Lead"][Math.floor(Math.random() * 4)],
        email: `buyer@${company.domain}`,
        phone: `+44 20 7946 0${String(100 + Math.floor(Math.random() * 900))}`,
        primary: true,
        companyId: company.id,
      },
    });
    const deal = await prisma.deal.create({
      data: {
        dealId: `D-${Math.floor(100000 + Math.random() * 900000)}`,
        name: `${name} × Layers`,
        stage,
        amount,
        companyId: company.id,
        contactId: contact.id,
        ownerId: userByKey[ownerKey],
        bdrId: userByKey["huzaifa"],
        closeDate: stage.startsWith("Closed") ? new Date() : null,
      },
    });
    dealRows.push({ id: deal.id, companyId: company.id, contactId: contact.id, name, stage, ownerKey });
    // Spread demo meetings across the next two weeks at realistic business
    // hours (09:00–17:00) so the calendar doesn't pile everything at midnight.
    const _md = new Date();
    _md.setDate(_md.getDate() + ((_mtgIdx % 14) - 3)); // -3 .. +10 days
    _md.setHours(9 + (_mtgIdx % 8), (_mtgIdx % 2) * 30, 0, 0); // 9am-4:30pm, :00/:30
    _mtgIdx++;
    await prisma.salesMeeting.create({
      data: {
        title: `${name} × Layers`,
        status: stage === "No Show / Reschedule" ? "No Show" : stage === "Appointment Scheduled" ? "Booked" : "Showed up",
        outcome: quoteId ? "Requested a Quote" : null,
        meetingDate: _md,
        dealId: deal.id,
        aeId: userByKey[ownerKey],
        bdrId: userByKey["huzaifa"],
      },
    });
    if (quoteId) dealByQuoteId[quoteId] = deal.id;
  }

  for (const q of QUOTES) {
    if (!companyByClient[q.client]) {
      const company = await prisma.company.create({
        data: {
          clientId: nextClientId(),
          name: q.client,
          type: "Wholesaler",
          tier: "B",
          leadStatus: "Open Deal",
          country: COUNTRY_BY_CLIENT[q.client] ?? "United Kingdom",
          ownerId: userByKey["rija"],
        },
      });
      companyByClient[q.client] = company.id;
    }

    const totalUnits = q.items.reduce((s, i) => s + i.qty, 0);
    const buying = q.items.reduce((s, i) => s + i.qty * i.target * 0.7, 0);
    const selling = q.items.reduce((s, i) => s + i.qty * i.target, 0);

    const quote = await prisma.quote.create({
      data: {
        quoteId: q.quoteId,
        type: q.type,
        status: q.status,
        priority: q.priority ?? "Medium",
        clientName: q.client,
        clientCountry: COUNTRY_BY_CLIENT[q.client] ?? "United Kingdom",
        dealId: dealByQuoteId[q.quoteId] ?? null,
        ownerId: userByKey["rija"],
        collaboratorId: userByKey["zikriya"],
        raghouseId: ragByName[q.raghouse],
        sellingPriceTotal: Math.round(selling * 100) / 100,
        buyingPriceTotal: Math.round(buying * 100) / 100,
        category: q.items[0]?.item,
        items: {
          create: q.items.map((it, idx) => ({
            item: it.item, quantity: it.qty, targetPrice: it.target, position: idx,
          })),
        },
      },
    });
    if (q.type === "Bulk") {
      await prisma.bulkDetail.create({
        data: { quoteId: quote.id, grade: q.grade ?? "A", whatHowMuch: `${q.items[0]?.item} × ${totalUnits}` },
      });
    } else {
      await prisma.handpickDetail.create({
        data: { quoteId: quote.id, status: q.status === "Closed/Won" ? "Confirmed" : "Curating", budget: selling },
      });
    }
  }

  let shipSeq = 70190800;
  for (const s of SHIPS) {
    const quote = await prisma.quote.findUnique({ where: { quoteId: s.quoteId }, include: { items: true } });
    if (!quote) continue;
    const units = quote.items.reduce((sum, i) => sum + i.quantity, 0);
    const orderType = units < 1000 ? "Air" : units <= 5000 ? "LCL" : "FCL";
    const boxes = Math.max(1, Math.round(units / 120));
    const weight = Math.round(units * 0.55);
    const perKg = 4.33;
    await prisma.fulfilment.create({
      data: {
        quoteId: quote.id,
        orderStage: s.orderStage,
        orderType,
        totalUnits: units,
        fromCity: s.from,
        destination: s.destination,
        consigneeAddress: s.destination,
        statusNote: s.statusNote,
        expectedFulfilment: new Date(s.eta),
        raghouseId: quote.raghouseId,
        carrierId: carrierByName[s.carrier],
        lastMileCourier: s.lastMile,
        deliveredDate: s.orderStage === "Delivered" ? new Date(s.eta) : null,
        notifiedClient: s.orderStage === "Delivered",
        awbNo: String(shipSeq++),
        invoiceNo3pl: `1198${17 + (shipSeq % 90)}`,
        layersOrderId: quote.quoteId,
        paymentStatus: s.orderStage === "Delivered" ? "Paid" : Math.random() > 0.5 ? "Paid" : "Pending",
        goodsDescription: quote.items.map((i) => i.item).join(", "),
        boxesBales: boxes,
        estimateWeight: weight,
        chargeableWeight: weight,
        totalChargedAmount: Math.round(weight * perKg * 100) / 100,
        perKgAmount: perKg,
        perKgPkr: 1625,
        lmTid: `1Z${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
      },
    });
  }

  // ── Sales activity: emails, calls, notes, meetings threaded to records ──
  const EMAIL_SUBJECTS = [
    "Intro — Layers Wholesale sourcing",
    "Your vintage sourcing quote",
    "Following up on our call",
    "Samples & moodboard",
    "Pricing for your next order",
  ];
  const NOTE_BODIES = [
    "Spoke with buyer — keen on Carhartt + denim, wants A-grade only.",
    "Budget confirmed for next drop. Sending picking list.",
    "Asked for video before committing. Following up Friday.",
    "Great call — booking a follow-up to review samples.",
    "Price sensitive; negotiating shipping hike down.",
  ];
  for (const d of dealRows) {
    const owner = USERS.find((u) => u.email.startsWith(d.ownerKey))?.name ?? "AE";
    const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
    await prisma.activity.create({
      data: { kind: "sale", type: "note", body: NOTE_BODIES[Math.floor(Math.random() * NOTE_BODIES.length)], actor: owner, companyId: d.companyId, dealId: d.id, contactId: d.contactId, createdAt: daysAgo(Math.floor(Math.random() * 20) + 1) },
    });
    await prisma.emailMessage.create({
      data: { direction: "outbound", subject: EMAIL_SUBJECTS[Math.floor(Math.random() * EMAIL_SUBJECTS.length)], body: "Hi — great speaking earlier. Here are the details we discussed. Let me know your thoughts and we can lock in the order.\n\nBest,\n" + owner, fromAddr: `${d.ownerKey}@layerswholesale.co`, toAddr: "buyer@client.com", companyId: d.companyId, dealId: d.id, contactId: d.contactId, createdAt: daysAgo(Math.floor(Math.random() * 15) + 1) },
    });
    if (Math.random() > 0.4) {
      await prisma.emailMessage.create({
        data: { direction: "inbound", subject: "Re: " + EMAIL_SUBJECTS[Math.floor(Math.random() * EMAIL_SUBJECTS.length)], body: "Thanks for this — looks good. Can you confirm lead time and grade before we proceed?", fromAddr: "buyer@client.com", toAddr: `${d.ownerKey}@layerswholesale.co`, companyId: d.companyId, dealId: d.id, contactId: d.contactId, createdAt: daysAgo(Math.floor(Math.random() * 10)) },
      });
    }
  }

  // ── Call logs: two-step disposition (connected + sentiment) ──
  const NOT_CONNECTED = ["No Answer", "Left Voicemail", "Stopped at Gatekeeper", "Wrong Number"];
  const CONNECTED = ["Call Back Later", "Interested / Follow up", "Not Interested", "SQL Booked"];
  const TRANSCRIPTS = [
    "AE: Hey, it's Layers Wholesale — quick one on your vintage sourcing.\nClient: Go on.\nAE: We can land A-grade Carhartt at a price that protects your margin. Worth a 15-min demo?\nClient: Yeah, book it in.",
    "AE: Calling about your bulk denim needs.\nClient: We're sorted for this quarter.\nAE: No worries — can I follow up before your next drop?\nClient: Sure, ping me in three weeks.",
    "AE: Hi, is this the buyer for the vintage line?\nGatekeeper: She's in a meeting.\nAE: When's a good time?\nGatekeeper: Try tomorrow AM.",
  ];
  const CALL_AGENTS: Array<[string, number]> = [
    ["huzaifa", 2271], ["fatima", 1840], ["adan", 1690], ["asjad", 1420],
    ["kamila", 1390], ["rija", 823], ["zikriya", 238], ["haider", 6],
  ];
  const anyContact = await prisma.contact.findFirst();
  for (const [key, total] of CALL_AGENTS) {
    const agent = USERS.find((u) => u.email.startsWith(key))?.name ?? key;
    const n = Math.max(1, Math.round(total / 25));
    const rows = Array.from({ length: n }, () => {
      const connected = Math.random() < 0.32; // ~32% connect
      const outcome = connected
        ? CONNECTED[Math.random() < 0.25 ? 3 : Math.floor(Math.random() * CONNECTED.length)] // bias to SQL Booked
        : NOT_CONNECTED[Math.random() < 0.55 ? 0 : Math.floor(Math.random() * NOT_CONNECTED.length)];
      return {
        contactId: anyContact!.id,
        number: "+44 20 7946 0000",
        direction: "outbound",
        connected,
        outcome,
        transcript: connected && Math.random() < 0.5 ? TRANSCRIPTS[Math.floor(Math.random() * TRANSCRIPTS.length)] : null,
        agent,
        durationSec: connected ? 60 + Math.floor(Math.random() * 600) : Math.floor(Math.random() * 25),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 28) * 86400000),
      };
    });
    await prisma.callLog.createMany({ data: rows });
  }

  // ── Tasks for the sales floor ──
  const TASK_TITLES = [
    ["Follow up on Carhartt quote", "Follow-up", "High"], ["Send picking list to Proud Vintage", "Email", "High"],
    ["Call back Menace Vintage", "Call", "Medium"], ["Prep demo for World Vintage", "To-do", "Medium"],
    ["Chase signed PO from Camden Thrift", "Follow-up", "High"], ["Qualify inbound from Leeds reseller", "Call", "Low"],
    ["Confirm grade A with buyer", "To-do", "Medium"], ["Book Q3 review with Aimee Campbell", "Meeting", "Low"],
  ] as const;
  const aeKeys = ["rija", "kamila", "asjad", "adan"];
  const allDeals = await prisma.deal.findMany({ take: 20 });
  for (let i = 0; i < TASK_TITLES.length; i++) {
    const [title, type, priority] = TASK_TITLES[i];
    const d = allDeals[i % allDeals.length];
    await prisma.task.create({
      data: {
        title, type, priority, done: i % 5 === 0,
        dueDate: new Date(Date.now() + (i - 2) * 86400000),
        ownerId: userByKey[aeKeys[i % aeKeys.length]],
        companyId: d?.companyId, dealId: d?.id,
      },
    });
  }

  await prisma.activity.createMany({
    data: [
      { kind: "sale", type: "system", body: "Deal won — LQ-48217 closed $18,400", actor: "Rija" },
      { kind: "sale", type: "system", body: "LQ-30912 quote sent — 1,200 pcs, awaiting client sign-off", actor: "Kamila" },
      { kind: "sale", type: "system", body: "Menace Vintage Ltd closed — £9,252", actor: "Rija" },
    ],
  });

  // ── Cadences (Salesloft-style) ──────────────────────────────────────────
  const CADENCES: { name: string; function: string; priority: string; owner: string; steps: { day: number; type: string; subject: string }[] }[] = [
    {
      name: "Outbound Prospecting — Tier 1 Account", function: "Outbound", priority: "High", owner: "rija",
      steps: [
        { day: 0, type: "task", subject: "Contact & account research" },
        { day: 0, type: "call", subject: "Call 1 — leave voicemail" },
        { day: 0, type: "email", subject: "Email 1 — personalised intro" },
        { day: 2, type: "linkedin", subject: "LinkedIn connection request" },
        { day: 3, type: "call", subject: "Call 2 — current sourcing?" },
        { day: 6, type: "email", subject: "Email 2 — Carhartt case study" },
        { day: 9, type: "call", subject: "Call 3 — share account screenshot" },
        { day: 14, type: "email", subject: "Email 3 — break-up note" },
      ],
    },
    {
      // 5-day call-only blitz (7–8 calls).
      name: "Call Blitz — 5 day / 8 call", function: "Outbound", priority: "High", owner: "huzaifa",
      steps: [
        { day: 0, type: "call", subject: "Call 1 — opener" },
        { day: 0, type: "call", subject: "Call 2 — afternoon retry" },
        { day: 1, type: "call", subject: "Call 3 — morning dial" },
        { day: 1, type: "call", subject: "Call 4 — afternoon dial" },
        { day: 2, type: "call", subject: "Call 5 — switch time block" },
        { day: 3, type: "call", subject: "Call 6 — value reminder" },
        { day: 4, type: "call", subject: "Call 7 — last attempt" },
        { day: 5, type: "call", subject: "Call 8 — break-up call" },
      ],
    },
    {
      // 5-day Call + Email cadence.
      name: "Call + Email — 5 day", function: "Outbound", priority: "High", owner: "zikriya",
      steps: [
        { day: 0, type: "call", subject: "Call 1 — opener" },
        { day: 0, type: "email", subject: "Email 1 — intro + catalogue" },
        { day: 1, type: "call", subject: "Call 2 — follow up on email" },
        { day: 2, type: "email", subject: "Email 2 — Carhartt case study" },
        { day: 3, type: "call", subject: "Call 3 — value reminder" },
        { day: 4, type: "email", subject: "Email 3 — pricing + next steps" },
        { day: 5, type: "call", subject: "Call 4 — break-up call" },
      ],
    },
    {
      // 10-day Call + Email + Voicemail cadence.
      name: "Call + Email + VM — 10 day", function: "Outbound", priority: "Medium", owner: "haider",
      steps: [
        { day: 0, type: "call", subject: "Call 1 — opener" },
        { day: 0, type: "email", subject: "Email 1 — personalised intro" },
        { day: 1, type: "call", subject: "Call 2 — leave voicemail" },
        { day: 2, type: "email", subject: "Email 2 — social proof" },
        { day: 3, type: "call", subject: "Call 3 — leave voicemail" },
        { day: 5, type: "email", subject: "Email 3 — case study" },
        { day: 6, type: "call", subject: "Call 4 — afternoon dial" },
        { day: 8, type: "call", subject: "Call 5 — leave voicemail" },
        { day: 8, type: "email", subject: "Email 4 — pricing" },
        { day: 10, type: "call", subject: "Call 6 — break-up call + VM" },
      ],
    },
    {
      name: "Inbound Follow-up", function: "Inbound", priority: "Medium", owner: "kamila",
      steps: [
        { day: 0, type: "call", subject: "Speed-to-lead call (5 min)" },
        { day: 0, type: "email", subject: "Thanks + next steps" },
        { day: 1, type: "call", subject: "Follow-up call" },
        { day: 3, type: "email", subject: "Catalogue + pricing" },
      ],
    },
  ];

  const someContacts = await prisma.contact.findMany({ take: 40, include: { company: true } });
  let ci = 0;
  for (const c of CADENCES) {
    const cadence = await prisma.cadence.create({
      data: {
        name: c.name, function: c.function, priority: c.priority, ownerId: userByKey[c.owner],
        steps: { create: c.steps.map((s, i) => ({ day: s.day, type: s.type, subject: s.subject, position: i })) },
      },
      include: { steps: { orderBy: { position: "asc" } } },
    });
    // Enroll a handful of contacts at varied steps so the dashboard has due work.
    const enrollCount = c.function === "Inbound" ? 4 : 6;
    for (let k = 0; k < enrollCount && ci < someContacts.length; k++, ci++) {
      const contact = someContacts[ci];
      const stepIdx = k % cadence.steps.length;
      const day = cadence.steps[stepIdx].day;
      // back-date startedAt so some steps are overdue / due today
      const started = new Date(Date.now() - (day + (k % 3)) * 86400000);
      await prisma.cadenceMembership.create({
        data: {
          cadenceId: cadence.id, contactId: contact.id, assigneeId: userByKey[c.owner],
          currentDay: day, startedAt: started,
        },
      });
    }
  }

  return { users: USERS.length, defaultPassword: DEFAULT_PASSWORD };
}
