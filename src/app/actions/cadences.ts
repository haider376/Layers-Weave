"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";

async function guard() {
  const user = await requireUser();
  if (!canAccessSales(user.role)) throw new Error("FORBIDDEN");
  return user;
}

function revalidate() {
  revalidatePath("/cadences");
  revalidatePath("/dashboard");
}

type StepInput = { day: number; type: string; subject: string };

export async function createCadenceAction(input: { name: string; function?: string; priority?: string; steps?: StepInput[] }) {
  const user = await guard();
  const cadence = await prisma.cadence.create({
    data: {
      name: input.name.trim() || "Untitled cadence",
      function: input.function ?? "Outbound",
      priority: input.priority ?? "Medium",
      ownerId: user.id,
      steps: input.steps?.length
        ? { create: input.steps.map((s, i) => ({ day: s.day, type: s.type, subject: s.subject, position: i })) }
        : { create: [{ day: 0, type: "call", subject: "First touch", position: 0 }] },
    },
  });
  revalidate();
  return { id: cadence.id };
}

// Create a cadence and navigate straight to its builder. Redirecting from the
// server action is the reliable way to open a freshly-created dynamic route
// (client-side router.push after a revalidating action can no-op).
export async function createAndOpenCadenceAction() {
  const user = await guard();
  const cadence = await prisma.cadence.create({
    data: {
      name: "Untitled cadence",
      function: "Outbound",
      priority: "Medium",
      ownerId: user.id,
      steps: { create: [{ day: 0, type: "call", subject: "First touch", position: 0 }] },
    },
  });
  revalidatePath("/cadences");
  redirect(`/cadences/${cadence.id}`);
}

export async function updateCadenceAction(id: string, data: { name?: string; function?: string; priority?: string; active?: boolean }) {
  await guard();
  await prisma.cadence.update({ where: { id }, data });
  revalidate();
}

export async function deleteCadenceAction(id: string) {
  await guard();
  await prisma.cadence.delete({ where: { id } });
  revalidate();
}

// Replace all steps for a cadence (used by the builder save).
export async function saveCadenceStepsAction(cadenceId: string, steps: StepInput[]) {
  await guard();
  await prisma.cadenceStep.deleteMany({ where: { cadenceId } });
  await prisma.cadenceStep.createMany({
    data: steps.map((s, i) => ({ cadenceId, day: s.day, type: s.type, subject: s.subject, position: i })),
  });
  revalidate();
}

// Enroll one or more contacts into a cadence (from company/contact pages).
export async function enrollContactsAction(cadenceId: string, contactIds: string[]) {
  const user = await guard();
  let added = 0;
  for (const contactId of contactIds) {
    const exists = await prisma.cadenceMembership.findUnique({ where: { cadenceId_contactId: { cadenceId, contactId } } });
    if (exists) {
      if (exists.status === "removed") {
        await prisma.cadenceMembership.update({ where: { id: exists.id }, data: { status: "active", currentDay: 0, startedAt: new Date() } });
        added++;
      }
      continue;
    }
    await prisma.cadenceMembership.create({ data: { cadenceId, contactId, assigneeId: user.id } });
    added++;
  }
  revalidate();
  return { added };
}

// Enroll every contact belonging to the selected companies/leads into a cadence.
export async function enrollCompaniesAction(cadenceId: string, companyIds: string[]) {
  const user = await guard();
  const contacts = await prisma.contact.findMany({ where: { companyId: { in: companyIds } }, select: { id: true } });
  let added = 0;
  for (const { id: contactId } of contacts) {
    const exists = await prisma.cadenceMembership.findUnique({ where: { cadenceId_contactId: { cadenceId, contactId } } });
    if (exists) {
      if (exists.status === "removed") {
        await prisma.cadenceMembership.update({ where: { id: exists.id }, data: { status: "active", currentDay: 0, startedAt: new Date() } });
        added++;
      }
      continue;
    }
    await prisma.cadenceMembership.create({ data: { cadenceId, contactId, assigneeId: user.id } });
    added++;
  }
  revalidate();
  return { added };
}

// Mark the current step done; advance the member to the next step (or complete).
export async function completeStepAction(membershipId: string, outcome?: string) {
  const user = await guard();
  const m = await prisma.cadenceMembership.findUniqueOrThrow({
    where: { id: membershipId },
    include: { cadence: { include: { steps: { orderBy: { position: "asc" } } } }, contact: true },
  });
  const steps = m.cadence.steps;
  const current = steps.find((s) => s.day === m.currentDay) ?? steps.find((s) => s.day >= m.currentDay);
  if (current) {
    await prisma.cadenceStepRun.create({ data: { membershipId, stepId: current.id, done: true, outcome, completedAt: new Date() } });
    // If it's a call step, log a real call so it shows in coaching/analytics.
    if (current.type === "call" && m.contact) {
      await prisma.callLog.create({
        data: {
          contactId: m.contactId, companyId: m.contact.companyId, number: m.contact.phone ?? "—",
          connected: outcome === "Connected" || outcome === "SQL Booked",
          outcome: outcome ?? "Logged", agent: user.name, via: "Cadence dialer",
        },
      });
    }
  }
  const next = steps.find((s) => s.day > m.currentDay);
  if (next) await prisma.cadenceMembership.update({ where: { id: membershipId }, data: { currentDay: next.day } });
  else await prisma.cadenceMembership.update({ where: { id: membershipId }, data: { status: "completed" } });
  revalidate();
}

export async function removeMemberAction(membershipId: string) {
  await guard();
  await prisma.cadenceMembership.update({ where: { id: membershipId }, data: { status: "removed" } });
  revalidate();
}
