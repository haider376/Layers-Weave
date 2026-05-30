"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessLogistics } from "@/lib/permissions";
import { automationFulfilmentStage } from "@/lib/automations";

export async function setOrderStageAction(fulfilmentId: string, orderStage: string) {
  const user = await requireUser();
  if (!canAccessLogistics(user.role)) throw new Error("FORBIDDEN");
  // Automation #7 — Delivered → auto-notify client + close lead-time clock.
  await automationFulfilmentStage(fulfilmentId, orderStage);
  revalidatePath("/logistics");
  revalidatePath("/dashboard");
}

// Editable fulfilment fields (Shahiq adds the Purchase Order on closed-won
// orders; coordinators fill shipment data). Head of Supply has logistics access.
export async function setFulfilmentFieldAction(
  fulfilmentId: string,
  field: "purchaseOrderUrl" | "consigneeAddress" | "bolNumber",
  value: string,
) {
  const user = await requireUser();
  if (!canAccessLogistics(user.role)) throw new Error("FORBIDDEN");
  await prisma.fulfilment.update({ where: { id: fulfilmentId }, data: { [field]: value || null } });
  revalidatePath("/logistics");
}
