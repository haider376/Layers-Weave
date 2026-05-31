"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";

async function guard() {
  const user = await requireUser();
  if (!canAccessSales(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export async function addTaskAction(input: { title: string; type: string; priority: string; dueDate?: string; companyId?: string; contactId?: string; dealId?: string }) {
  const user = await guard();
  if (!input.title.trim()) return;
  await prisma.task.create({
    data: {
      title: input.title.trim(), type: input.type, priority: input.priority, ownerId: user.id,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      companyId: input.companyId ?? null, contactId: input.contactId ?? null, dealId: input.dealId ?? null,
    },
  });
  revalidatePath("/tasks");
  if (input.companyId) revalidatePath(`/companies/${input.companyId}`);
  if (input.contactId) revalidatePath(`/contacts/${input.contactId}`);
}

export async function toggleTaskAction(id: string) {
  await guard();
  const t = await prisma.task.findUniqueOrThrow({ where: { id } });
  await prisma.task.update({ where: { id }, data: { done: !t.done } });
  revalidatePath("/tasks");
}

export async function deleteTaskAction(id: string) {
  await guard();
  await prisma.task.delete({ where: { id } });
  revalidatePath("/tasks");
}
