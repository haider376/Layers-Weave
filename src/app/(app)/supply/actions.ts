"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessSupply, canSeeRaghouse } from "@/lib/permissions";
import { automationRecomputeUnits, automationSetQuoteType } from "@/lib/automations";
import { generateQuoteId } from "@/lib/quoteId";

async function guard() {
  const user = await requireUser();
  if (!canAccessSupply(user.role)) throw new Error("FORBIDDEN");
  return user;
}

// Update a top-level quote field. Setting the raghouse is permission-gated
// server-side (acceptance criteria — not just hidden in the UI).
export async function setQuoteFieldAction(
  quoteId: string,
  field: "clientName" | "status" | "priority" | "type" | "raghouseId" | "grade",
  value: string,
) {
  const user = await guard();
  const quote = await prisma.quote.findUniqueOrThrow({ where: { quoteId } });

  if (field === "raghouseId") {
    if (!canSeeRaghouse(user.role)) throw new Error("FORBIDDEN: raghouse is hidden from your role");
    await prisma.quote.update({ where: { id: quote.id }, data: { raghouseId: value || null } });
  } else if (field === "type") {
    await automationSetQuoteType(quote.id, value === "Handpick" ? "Handpick" : "Bulk");
  } else if (field === "grade") {
    await prisma.bulkDetail.upsert({
      where: { quoteId: quote.id },
      create: { quoteId: quote.id, grade: value },
      update: { grade: value },
    });
  } else {
    await prisma.quote.update({ where: { id: quote.id }, data: { [field]: value } });
  }
  revalidatePath("/supply");
}

export async function setLineItemAction(
  lineItemId: string,
  field: "item" | "quantity" | "targetPrice",
  value: string,
) {
  await guard();
  const data =
    field === "item"
      ? { item: value }
      : field === "quantity"
        ? { quantity: Math.max(0, Math.round(Number(value) || 0)) }
        : { targetPrice: Math.max(0, Number(value) || 0) };
  const li = await prisma.quoteLineItem.update({ where: { id: lineItemId }, data });
  // Automation #9 — total units changed → re-derive any fulfilment order type.
  if (field === "quantity") await automationRecomputeUnits(li.quoteId);
  revalidatePath("/supply");
}

export async function addLineItemAction(quoteId: string) {
  await guard();
  const quote = await prisma.quote.findUniqueOrThrow({ where: { quoteId }, include: { items: true } });
  const li = await prisma.quoteLineItem.create({
    data: { quoteId: quote.id, item: "", quantity: 0, targetPrice: 0, position: quote.items.length },
  });
  revalidatePath("/supply");
  return { id: li.id };
}

export async function removeLineItemAction(lineItemId: string) {
  await guard();
  const li = await prisma.quoteLineItem.findUniqueOrThrow({ where: { id: lineItemId } });
  const count = await prisma.quoteLineItem.count({ where: { quoteId: li.quoteId } });
  if (count <= 1) {
    // keep at least one line — just blank it
    await prisma.quoteLineItem.update({ where: { id: lineItemId }, data: { item: "", quantity: 0, targetPrice: 0 } });
  } else {
    await prisma.quoteLineItem.delete({ where: { id: lineItemId } });
  }
  await automationRecomputeUnits(li.quoteId);
  revalidatePath("/supply");
}

// Shahiq answers consolidated demand: sources an item, records the supplier
// buying price (margin-walled) + grade + specs, and notifies Sales with the
// info they need to negotiate — WITHOUT exposing the buying price.
export async function answerDemandAction(input: {
  itemName: string;
  quoteRefs: string[];
  totalQty: number;
  availabilityQty: number;
  buyingPricePerItem: number;
  grade: string;
  mixSpecs: string;
  salesMessage: string;
  raghouseId?: string;
}) {
  const user = await guard();
  const resp = await prisma.sourcingResponse.create({
    data: {
      itemName: input.itemName,
      quoteRefs: input.quoteRefs.join(","),
      totalQty: input.totalQty,
      availabilityQty: input.availabilityQty || input.totalQty,
      buyingPricePerItem: input.buyingPricePerItem || null,
      grade: input.grade || null,
      mixSpecs: input.mixSpecs || null,
      salesMessage: input.salesMessage || null,
      raghouseId: input.raghouseId || null,
      createdBy: user.name,
    },
  });

  // Thread a sales-safe activity onto every deal behind the covered quotes.
  const quotes = await prisma.quote.findMany({
    where: { quoteId: { in: input.quoteRefs } },
    include: { deal: true },
  });
  const salesBody =
    `Supply sourced ${input.itemName}` +
    (input.grade ? ` · Grade ${input.grade}` : "") +
    ` · ${(input.availabilityQty || input.totalQty).toLocaleString("en-US")} available` +
    (input.mixSpecs ? ` · ${input.mixSpecs}` : "") +
    ". Ready to negotiate with the client.";
  for (const q of quotes) {
    await prisma.activity.create({
      data: {
        kind: "supply", type: "system", body: salesBody, actor: user.name,
        companyId: q.deal?.companyId, dealId: q.dealId, quoteRef: q.quoteId,
      },
    });
  }
  await prisma.notification.create({
    data: { audience: "Sales", body: `${input.itemName} sourced for ${input.quoteRefs.join(", ")} — negotiate now` },
  });
  revalidatePath("/supply");
  revalidatePath("/dashboard");
  return { id: resp.id };
}

export async function addQuoteAction() {
  const user = await guard();
  const quoteId = await generateQuoteId();
  const quote = await prisma.quote.create({
    data: {
      quoteId,
      type: "Bulk",
      status: "In Progress",
      clientName: "New client",
      ownerId: user.id,
      items: { create: [{ item: "", quantity: 0, targetPrice: 0, position: 0 }] },
    },
  });
  await automationSetQuoteType(quote.id, "Bulk");
  revalidatePath("/supply");
  return { quoteId };
}
