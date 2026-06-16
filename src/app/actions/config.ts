"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { savePermissionMatrix, saveAppConfig, type PermissionMatrix, type AppConfig } from "@/lib/appConfig";

export async function savePermissionsAction(matrix: PermissionMatrix) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Not permitted");
  await savePermissionMatrix(matrix);
  revalidatePath("/settings");
  return { ok: true };
}

export async function saveConfigAction(config: AppConfig) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Not permitted");
  await saveAppConfig(config);
  revalidatePath("/settings");
  return { ok: true };
}
