import { prisma, safe } from "@/lib/db";

// Monthly sales goals — a team-wide target plus per-AE individual targets.
// Persisted as a single JSON row in AppSetting (key = "sales-goals").
export type SalesGoals = {
  team: { revenue: number; sqls: number; calls: number };
  // keyed by AE first-name (lowercase) → individual monthly targets
  individual: Record<string, { revenue: number; sqls: number; calls: number }>;
};

export const AE_FIRST = ["haider", "zikriya", "rija", "hilmand", "asjad", "adan", "kamila"];

export const DEFAULT_GOALS: SalesGoals = {
  team: { revenue: 30000, sqls: 20, calls: 800 },
  individual: Object.fromEntries(AE_FIRST.map((n) => [n, { revenue: 6000, sqls: 4, calls: 120 }])),
};

const KEY = "sales-goals";

export async function getSalesGoals(): Promise<SalesGoals> {
  const row = await safe(prisma.appSetting.findUnique({ where: { key: KEY } }), null);
  if (!row?.value) return DEFAULT_GOALS;
  try {
    const parsed = JSON.parse(row.value) as Partial<SalesGoals>;
    return {
      team: { ...DEFAULT_GOALS.team, ...(parsed.team ?? {}) },
      individual: { ...DEFAULT_GOALS.individual, ...(parsed.individual ?? {}) },
    };
  } catch {
    return DEFAULT_GOALS;
  }
}

export async function saveSalesGoals(goals: SalesGoals): Promise<void> {
  await safe(
    prisma.appSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, value: JSON.stringify(goals) },
      update: { value: JSON.stringify(goals) },
    }),
    null,
  );
}
