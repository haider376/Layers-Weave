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
const NUMERIC_FIELDS = new Set(["boxesBales", "totalChargedAmount", "perKgAmount", "perKgPkr", "estimateWeight", "chargeableWeight"]);
const INT_FIELDS = new Set(["boxesBales"]);
const STRING_FIELDS = new Set([
  "purchaseOrderUrl", "consigneeAddress", "bolNumber", "awbNo", "invoiceNo3pl",
  "layersOrderId", "paymentStatus", "goodsDescription", "lmTid", "lastMileCourier",
  "fromCity", "destination", "statusNote",
]);

export async function setFulfilmentFieldAction(fulfilmentId: string, field: string, value: string) {
  const user = await requireUser();
  if (!canAccessLogistics(user.role)) throw new Error("FORBIDDEN");
  if (!NUMERIC_FIELDS.has(field) && !STRING_FIELDS.has(field)) throw new Error("FIELD_NOT_ALLOWED");

  let data: Record<string, unknown>;
  if (NUMERIC_FIELDS.has(field)) {
    const n = value === "" ? null : INT_FIELDS.has(field) ? Math.round(Number(value)) : Number(value);
    data = { [field]: Number.isFinite(n as number) ? n : null };
  } else {
    data = { [field]: value || null };
  }
  await prisma.fulfilment.update({ where: { id: fulfilmentId }, data });
  revalidatePath("/logistics");
}
