"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroySession, requireUser, setViewAs } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function setViewAsAction(role: string | null) {
  await setViewAs(role);
  revalidatePath("/", "layout");
}

export async function updateProfileAction(data: { name?: string; title?: string }) {
  const user = await requireUser();
  const patch: Record<string, string> = {};
  if (data.name?.trim()) patch.name = data.name.trim();
  if (data.title?.trim()) patch.title = data.title.trim();
  if (Object.keys(patch).length) await prisma.user.update({ where: { id: user.id }, data: patch });
  revalidatePath("/", "layout");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function updateAvatarAction(dataUrl: string) {
  const user = await requireUser();
  // data URLs can be large; cap to keep the demo SQLite row sane.
  if (dataUrl.length > 1_500_000) throw new Error("Image too large");
  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: dataUrl } });
  return { ok: true };
}
