import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "password";

// §6 roster — role strings match src/lib/permissions.ts Role type.
const USERS = [
  { email: "haider@layerswholesale.com", name: "Haider Ali Rana", role: "CRO", title: "Chief Revenue Officer" },
  { email: "zikriya@layerswholesale.com", name: "Zikriya Abbasi", role: "Sales Manager", title: "Sales Manager" },
  { email: "rija@layerswholesale.com", name: "Rija Fatima", role: "AE/QA", title: "Account Executive / QA" },
  { email: "kamila@layerswholesale.com", name: "Kamila Batool", role: "AE", title: "Account Executive" },
  { email: "asjad@layerswholesale.com", name: "Asjad Malik", role: "AE", title: "Account Executive" },
  { email: "hilmand@layerswholesale.com", name: "Hilmand Kamal", role: "AE", title: "Account Executive" },
  { email: "adan@layerswholesale.com", name: "Adan Khalid", role: "AE (Probation)", title: "Account Executive (Probation)" },
  { email: "huzaifa@layerswholesale.com", name: "Huzaifa Asad", role: "BDR", title: "Business Development Rep" },
  { email: "fatima@layerswholesale.com", name: "Fatima Khan", role: "BDR", title: "Business Development Rep" },
  { email: "shahzaib@layerswholesale.com", name: "Shahzaib Rana", role: "Lead Gen/CRM", title: "Lead Gen / CRM" },
  { email: "shahiq@layerswholesale.com", name: "Shahiq Iqbal Tariq", role: "Head of Supply", title: "Head of Supply" },
  { email: "myra@layerswholesale.com", name: "Myra Bukhari", role: "Womenswear", title: "Head of Womenswear" },
  { email: "waris@layerswholesale.com", name: "Muhammad Waris", role: "Logistics Coordinator", title: "Logistics Coordinator" },
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
  ["Billy Wilson", "hilmand", 500, "No Show / Reschedule"],
  ["Rachel Grady", "rija", 500, "No Show / Reschedule"],
  ["Proud Vintage", "kamila", 500, "Initiation", "LQ-71044"],
  ["Neal · Better With Age", "hilmand", 500, "Initiation", "LQ-22581"],
  ["Malek Aliwan", "rija", 500, "Handpick / Bulk Vintage", "LQ-50431"],
  ["Livia Walled", "kamila", 500, "Handpick / Bulk Vintage", "LQ-30912"],
  ["World Vintage Wholesale", "hilmand", 2431, "Closed Won", "LQ-48217"],
  ["Menace Vintage Ltd", "rija", 9252, "Closed Won", "LQ-19880"],
  ["Aimee Campbell", "kamila", 1934, "Closed Won", "LQ-67802"],
  ["Emma Bulkeley", "asjad", 500, "Closed Lost"],
  ["Christie Covers", "hilmand", 500, "Closed Lost"],
  ["Kiki", "hilmand", 500, "Disqualified"],
];

// Quotes (supply) — quoteId, client, type, grade, raghouse, status, items[]
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
  // Closed-won deal that flowed straight to logistics
  { quoteId: "LQ-19880", client: "Menace Vintage Ltd", type: "Bulk", grade: "A", raghouse: "Vintage Wholesale Collection", status: "Delivered", priority: "High", items: [{ item: "Vintage knitwear", qty: 900, target: 11.0 }] },
  // Logistics-only quote (in transit) not surfaced on the kanban
  { quoteId: "LQ-33915", client: "Camden Thrift Co", type: "Bulk", grade: "A", raghouse: "Imperial", status: "Closed/Won", priority: "Medium", items: [{ item: "Branded windbreakers", qty: 620, target: 12.5 }] },
];

// Fulfilments (logistics) — quoteId, fromCity, destination, carrier, orderStage, statusNote, etaDaysFromNow
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

let clientCounter = 1000;
function nextClientId() {
  return `C-${clientCounter++}`;
}

async function main() {
  console.log("Resetting data…");
  // Order matters for FK constraints
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

  console.log("Seeding users…");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const userByKey: Record<string, string> = {};
  for (const u of USERS) {
    const created = await prisma.user.create({ data: { ...u, passwordHash } });
    userByKey[u.email.split("@")[0]] = created.id;
  }

  console.log("Seeding reference tables…");
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

  console.log("Seeding companies, contacts & deals…");
  const dealByQuoteId: Record<string, string> = {};
  const companyByClient: Record<string, string> = {};

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
    await prisma.contact.create({
      data: {
        name: `${name.split(" ")[0]} (primary)`,
        title: "Founder",
        email: `buyer@${company.domain}`,
        phone: "+44 20 7946 0000",
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
        ownerId: userByKey[ownerKey],
        bdrId: userByKey["huzaifa"],
        closeDate: stage.startsWith("Closed") ? new Date() : null,
      },
    });
    // Meeting record for each deal (auto-created on SQL)
    await prisma.salesMeeting.create({
      data: {
        title: `${name} × Layers`,
        status: stage === "No Show / Reschedule" ? "No Show" : stage === "Appointment Scheduled" ? "Booked" : "Showed up",
        outcome: quoteId ? "Requested a Quote" : null,
        meetingDate: new Date(),
        dealId: deal.id,
        aeId: userByKey[ownerKey],
        bdrId: userByKey["huzaifa"],
      },
    });
    if (quoteId) dealByQuoteId[quoteId] = deal.id;
  }

  console.log("Seeding quotes & line items…");
  for (const q of QUOTES) {
    // Ensure a company exists for logistics-only clients
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
    const buying = q.items.reduce((s, i) => s + i.qty * i.target * 0.7, 0); // implied buy ≈ 70% of target
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
        collaboratorId: userByKey["shahiq"],
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

  console.log("Seeding fulfilments (logistics)…");
  for (const s of SHIPS) {
    const quote = await prisma.quote.findUnique({
      where: { quoteId: s.quoteId },
      include: { items: true },
    });
    if (!quote) continue;
    const units = quote.items.reduce((sum, i) => sum + i.quantity, 0);
    const orderType = units < 1000 ? "Air" : units <= 5000 ? "LCL" : "FCL";
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
      },
    });
  }

  console.log("Seeding activity feed…");
  await prisma.activity.createMany({
    data: [
      { kind: "sale", body: "Deal won — LQ-48217 closed $18,400", actor: "Rija" },
      { kind: "supply", body: "LQ-30912 ready — 1,200 pcs graded & listed", actor: "Shahiq" },
      { kind: "ship", body: "LQ-33915 dispatched via Expost to London", actor: "Waris" },
    ],
  });

  console.log("✅ Seed complete.");
  console.log(`   Users: ${USERS.length} (password for all: "${DEFAULT_PASSWORD}")`);
  console.log("   Sign in e.g. haider@layerswholesale.com / password");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
