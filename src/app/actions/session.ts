"use server";

import { redirect } from "next/navigation";
import { destroySession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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
