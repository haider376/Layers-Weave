"use server";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audiencesFor } from "@/lib/permissions";

export async function getMyNotificationsAction() {
  const user = await requireUser();
  const audiences = audiencesFor(user.role);
  const items = await prisma.notification.findMany({
    where: { audience: { in: audiences } },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  const unread = items.filter((n) => !n.read).length;
  return {
    unread,
    items: items.map((n) => ({ id: n.id, audience: n.audience, body: n.body, read: n.read, at: n.createdAt.toISOString() })),
  };
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  const audiences = audiencesFor(user.role);
  await prisma.notification.updateMany({ where: { audience: { in: audiences }, read: false }, data: { read: true } });
}
