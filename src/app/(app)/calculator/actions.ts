"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type CalcInput = {
  quoteId?: string | null;
  buyingPrice: number;
  quantity: number;
  markup: number;
  shippingCost: number;
  shippingHike: number;
};

// §7 — Save calculator output to a quote. A 5% markup is below the 15% floor and
// must be routed to the CRO for approval; it cannot be saved/sent directly.
export async function savePricingAction(input: CalcInput) {
  const user = await requireUser();

  const sell = input.buyingPrice * (1 + input.markup / 100);
  const itemsSubtotal = sell * input.quantity;
  const shipOut = input.shippingCost * (1 + input.shippingHike / 100);
  const clientTotal = itemsSubtotal + shipOut;
  const buyingTotal = input.buyingPrice * input.quantity + input.shippingCost;

  const quote = input.quoteId
    ? await prisma.quote.findUnique({ where: { quoteId: input.quoteId } })
    : null;

  if (input.markup === 5) {
    await prisma.priceApproval.create({
      data: {
        markup: input.markup,
        buyingPrice: input.buyingPrice,
        quantity: input.quantity,
        shippingCost: input.shippingCost,
        shippingHike: input.shippingHike,
        clientTotal,
        status: "Pending",
        requestedBy: user.name,
        quoteId: quote?.id ?? null,
      },
    });
    await prisma.notification.create({
      data: { audience: "All", body: `CRO approval requested: ${input.quoteId ?? "new quote"} at 5% markup (${user.name})` },
    });
    return { approval: true as const, clientTotal };
  }

  if (quote) {
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        sellingPriceTotal: Math.round(clientTotal * 100) / 100,
        buyingPriceTotal: Math.round(buyingTotal * 100) / 100,
      },
    });
    revalidatePath("/supply");
  }
  return { approval: false as const, clientTotal, saved: !!quote };
}
