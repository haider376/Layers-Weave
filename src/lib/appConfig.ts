import { prisma, safe } from "@/lib/db";
import type { Role } from "@/lib/permissions";

// ── Permission matrix ──────────────────────────────────────────────────────
// Admin-editable capability grid: which roles may perform each capability.
// Stored as JSON in AppSetting (key = "permissions"). Falls back to sensible
// defaults derived from the hard-coded rules in permissions.ts.

export type Capability =
  | "seeMargin"
  | "reassignOwner"
  | "approvePricing"
  | "editAllRecords"
  | "exportData"
  | "manageGoals"
  | "deleteRecords";

export const CAPABILITIES: { key: Capability; label: string; desc: string }[] = [
  { key: "seeMargin", label: "See margin & buying price", desc: "View true cost and margin on quotes" },
  { key: "reassignOwner", label: "Reassign account owners", desc: "Change the AE / BDR on any account" },
  { key: "approvePricing", label: "Approve sub-floor pricing", desc: "Sign off discounts below the 15% floor" },
  { key: "editAllRecords", label: "Edit any record", desc: "Edit records they don't own" },
  { key: "exportData", label: "Export data", desc: "Download CSV exports of leads / deals / people" },
  { key: "manageGoals", label: "Manage sales goals", desc: "Set team & individual targets" },
  { key: "deleteRecords", label: "Delete records", desc: "Permanently remove deals / companies" },
];

export const SALES_ROLE_LIST: Role[] = [
  "CEO", "CRO", "Sales Manager", "AE/QA", "AE", "AE (Probation)", "BDR", "Lead Gen/CRM",
];

export type PermissionMatrix = Record<Capability, Role[]>;

export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  seeMargin: ["CRO", "Sales Manager", "AE/QA"],
  reassignOwner: ["CRO", "Sales Manager", "AE/QA", "Lead Gen/CRM"],
  approvePricing: ["CRO", "AE/QA"],
  editAllRecords: ["CRO", "Sales Manager", "AE/QA"],
  exportData: ["CRO", "Sales Manager", "AE/QA", "AE", "Lead Gen/CRM"],
  manageGoals: ["CRO", "Sales Manager", "AE/QA"],
  deleteRecords: ["CRO", "Sales Manager"],
};

const PERM_KEY = "permissions";

export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  const row = await safe(prisma.appSetting.findUnique({ where: { key: PERM_KEY } }), null);
  if (!row?.value) return DEFAULT_PERMISSIONS;
  try {
    const saved = JSON.parse(row.value) as Partial<PermissionMatrix>;
    const out = {} as PermissionMatrix;
    for (const { key } of CAPABILITIES) out[key] = saved[key] ?? DEFAULT_PERMISSIONS[key];
    return out;
  } catch {
    return DEFAULT_PERMISSIONS;
  }
}

export async function savePermissionMatrix(matrix: PermissionMatrix): Promise<void> {
  await safe(
    prisma.appSetting.upsert({
      where: { key: PERM_KEY },
      create: { key: PERM_KEY, value: JSON.stringify(matrix) },
      update: { value: JSON.stringify(matrix) },
    }),
    null,
  );
}

export async function roleCan(role: string, cap: Capability): Promise<boolean> {
  const matrix = await getPermissionMatrix();
  return matrix[cap].includes(role as Role);
}

// ── App configuration (feature flags / behavior) ───────────────────────────
// Admin-editable switches that change how the app behaves at runtime.
export type AppConfig = {
  currency: "GBP" | "USD" | "EUR";
  defaultMarkupPct: number;
  shippingHikePct: number;
  perKgRate: number;
  autoQuoteOnRequest: boolean;
  requireApprovalBelowPct: number;
  celebrationsOn: boolean;
  weekStartsMonday: boolean;
  leaderboardPublic: boolean;
};

export const DEFAULT_CONFIG: AppConfig = {
  currency: "GBP",
  defaultMarkupPct: 30,
  shippingHikePct: 10,
  perKgRate: 4.33,
  autoQuoteOnRequest: true,
  requireApprovalBelowPct: 15,
  celebrationsOn: true,
  weekStartsMonday: false,
  leaderboardPublic: true,
};

const CONFIG_KEY = "app-config";

export async function getAppConfig(): Promise<AppConfig> {
  const row = await safe(prisma.appSetting.findUnique({ where: { key: CONFIG_KEY } }), null);
  if (!row?.value) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...(JSON.parse(row.value) as Partial<AppConfig>) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveAppConfig(config: AppConfig): Promise<void> {
  await safe(
    prisma.appSetting.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: JSON.stringify(config) },
      update: { value: JSON.stringify(config) },
    }),
    null,
  );
}
