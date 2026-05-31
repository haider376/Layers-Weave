"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { saveSalesGoals, type SalesGoals } from "@/lib/goals";

export async function saveGoalsAction(goals: SalesGoals) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Not permitted");
  await saveSalesGoals(goals);
  revalidatePath("/goals");
  revalidatePath("/settings");
  return { ok: true };
}
