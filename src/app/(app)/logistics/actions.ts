"use server";

import { revalidatePath } from "next/cache";
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
