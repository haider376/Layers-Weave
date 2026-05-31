import { prisma, safe } from "@/lib/db";

// Cadence step types and their display metadata (icon path is a single SVG <path d>).
export const STEP_TYPES = ["call", "email", "linkedin", "task"] as const;
export type StepType = (typeof STEP_TYPES)[number];

export const STEP_META: Record<StepType, { label: string; color: string; icon: string }> = {
  call: { label: "Call", color: "#0b8043", icon: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" },
  email: { label: "Email", color: "#1a73e8", icon: "M2 7l10 6 10-6M2 7v10a2 2 0 002 2h16a2 2 0 002-2V7M2 7a2 2 0 012-2h16a2 2 0 012 2" },
  linkedin: { label: "LinkedIn", color: "#7c3aed", icon: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z" },
  task: { label: "Task", color: "#f09300", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" },
};

export const FUNCTIONS = ["Inbound", "Outbound", "Event", "Other"] as const;

// ── Ready-made cadence templates (one-click create from the dashboard) ──────
export type CadenceTemplateStep = { day: number; type: StepType; subject: string };
export type CadenceTemplate = { id: string; name: string; function: string; priority: string; blurb: string; steps: CadenceTemplateStep[] };

export const CADENCE_TEMPLATES: CadenceTemplate[] = [
  {
    id: "call-5d-8",
    name: "Call Blitz — 5 day / 8 call",
    function: "Outbound", priority: "High",
    blurb: "Call-only · 5 days · 8 dials",
    steps: [
      { day: 0, type: "call", subject: "Call 1 — opener" },
      { day: 0, type: "call", subject: "Call 2 — afternoon retry" },
      { day: 1, type: "call", subject: "Call 3 — morning dial" },
      { day: 1, type: "call", subject: "Call 4 — afternoon dial" },
      { day: 2, type: "call", subject: "Call 5 — switch time block" },
      { day: 3, type: "call", subject: "Call 6 — value reminder" },
      { day: 4, type: "call", subject: "Call 7 — last attempt" },
      { day: 5, type: "call", subject: "Call 8 — break-up call" },
    ],
  },
  {
    id: "call-email-5d",
    name: "Call + Email — 5 day",
    function: "Outbound", priority: "High",
    blurb: "Call + email · 5 days · 7 touches",
    steps: [
      { day: 0, type: "call", subject: "Call 1 — opener" },
      { day: 0, type: "email", subject: "Email 1 — intro + catalogue" },
      { day: 1, type: "call", subject: "Call 2 — follow up on email" },
      { day: 2, type: "email", subject: "Email 2 — Carhartt case study" },
      { day: 3, type: "call", subject: "Call 3 — value reminder" },
      { day: 4, type: "email", subject: "Email 3 — pricing + next steps" },
      { day: 5, type: "call", subject: "Call 4 — break-up call" },
    ],
  },
  {
    id: "call-email-vm-10d",
    name: "Call + Email + VM — 10 day",
    function: "Outbound", priority: "Medium",
    blurb: "Call + email + voicemail · 10 days · 10 touches",
    steps: [
      { day: 0, type: "call", subject: "Call 1 — opener" },
      { day: 0, type: "email", subject: "Email 1 — personalised intro" },
      { day: 1, type: "call", subject: "Call 2 — leave voicemail" },
      { day: 2, type: "email", subject: "Email 2 — social proof" },
      { day: 3, type: "call", subject: "Call 3 — leave voicemail" },
      { day: 5, type: "email", subject: "Email 3 — case study" },
      { day: 6, type: "call", subject: "Call 4 — afternoon dial" },
      { day: 8, type: "call", subject: "Call 5 — leave voicemail" },
      { day: 8, type: "email", subject: "Email 4 — pricing" },
      { day: 10, type: "call", subject: "Call 6 — break-up call + VM" },
    ],
  },
];

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dayMs = 86400000;

// Compute the due-date of a contact's CURRENT step (membership.startedAt + step.day).
export function stepDueDate(startedAt: Date, day: number): Date {
  const d = new Date(startedAt);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + day);
  return d;
}

export type DueBucket = "overdue" | "today" | "thisweek" | "later";
export function dueBucket(due: Date): DueBucket {
  const today = startOfToday().getTime();
  const t = new Date(due); t.setHours(0, 0, 0, 0);
  const diff = Math.round((t.getTime() - today) / dayMs);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "thisweek";
  return "later";
}

// Full cadence list with rollup metrics for the dashboard.
export async function listCadences() {
  const cadences = await safe(prisma.cadence.findMany({
    include: {
      owner: true,
      steps: { orderBy: { position: "asc" } },
      members: { include: { runs: true } },
    },
    orderBy: { updatedAt: "desc" },
  }), []);

  return cadences.map((c) => {
    const active = c.members.filter((m) => m.status === "active");
    const completed = c.members.filter((m) => m.status === "completed");
    // steps due = active members whose current step due-date is today or earlier
    let stepsDue = 0;
    for (const m of active) {
      const step = c.steps.find((s) => s.day === m.currentDay) ?? c.steps.find((s) => s.day >= m.currentDay);
      if (!step) continue;
      const due = stepDueDate(m.startedAt, step.day);
      const b = dueBucket(due);
      if (b === "overdue" || b === "today") stepsDue++;
    }
    return {
      id: c.id,
      name: c.name,
      function: c.function,
      priority: c.priority,
      active: c.active,
      owner: c.owner?.name ?? "—",
      steps: c.steps.length,
      callSteps: c.steps.filter((s) => s.type === "call").length,
      emailSteps: c.steps.filter((s) => s.type === "email").length,
      activePeople: active.length,
      totalPeople: c.members.length,
      completed: completed.length,
      stepsDue,
      updatedAt: c.updatedAt.toISOString(),
    };
  });
}

export type DueStep = {
  membershipId: string; cadenceId: string; cadenceName: string; cadenceFunction: string;
  contactId: string; contactName: string; contactTitle: string; contactPhone: string; contactEmail: string;
  company: string; assignee: string; stepType: StepType; stepSubject: string; stepLabel: string;
  day: number; due: string; bucket: DueBucket;
};

// The "Rhythm" task list: every active membership's current due step, flattened
// into runnable rows for the dashboard (the quick-dial queue).
export async function listDueSteps(assigneeId?: string): Promise<DueStep[]> {
  const members = await safe(prisma.cadenceMembership.findMany({
    where: { status: "active", ...(assigneeId ? { assigneeId } : {}) },
    include: {
      cadence: { include: { steps: { orderBy: { position: "asc" } } } },
      contact: { include: { company: true } },
      assignee: true,
      runs: true,
    },
  }), []);

  const rows = members.map((m) => {
    const steps = m.cadence.steps;
    const step = steps.find((s) => s.day === m.currentDay) ?? steps.find((s) => s.day >= m.currentDay) ?? steps[steps.length - 1];
    if (!step) return null;
    const idx = steps.findIndex((s) => s.id === step.id);
    const due = stepDueDate(m.startedAt, step.day);
    return {
      membershipId: m.id,
      cadenceId: m.cadenceId,
      cadenceName: m.cadence.name,
      cadenceFunction: m.cadence.function,
      contactId: m.contactId,
      contactName: m.contact.name,
      contactTitle: m.contact.title ?? "",
      contactPhone: m.contact.phone ?? "",
      contactEmail: m.contact.email ?? "",
      company: m.contact.company?.name ?? "—",
      assignee: m.assignee?.name ?? "Unassigned",
      stepType: step.type as StepType,
      stepSubject: step.subject,
      stepLabel: `Day ${step.day} · Step ${idx + 1}`,
      day: step.day,
      due: due.toISOString(),
      bucket: dueBucket(due),
    } satisfies DueStep;
  }).filter((r): r is DueStep => r !== null);

  // sort: overdue → today → thisweek → later, then by due date
  const order: Record<string, number> = { overdue: 0, today: 1, thisweek: 2, later: 3 };
  rows.sort((a, b) => (order[a.bucket] - order[b.bucket]) || (a.due < b.due ? -1 : 1));
  return rows;
}
