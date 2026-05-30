// Roles & permission rules (spec §6, §6.5, §3.5)
// These are enforced server-side so an AE cannot read buying price or the
// raghouse via the API — not merely hidden in the UI (acceptance criteria).

export type Role =
  | "CRO"
  | "Sales Manager"
  | "AE/QA"
  | "AE"
  | "AE (Probation)"
  | "BDR"
  | "Lead Gen/CRM"
  | "Head of Supply"
  | "Womenswear"
  | "Logistics Coordinator";

export const ROLE_LABEL: Record<Role, string> = {
  CRO: "Chief Revenue Officer",
  "Sales Manager": "Sales Manager",
  "AE/QA": "Account Executive / QA",
  AE: "Account Executive",
  "AE (Probation)": "Account Executive (Probation)",
  BDR: "Business Development Rep",
  "Lead Gen/CRM": "Lead Gen / CRM",
  "Head of Supply": "Head of Supply",
  Womenswear: "Head of Womenswear",
  "Logistics Coordinator": "Logistics Coordinator",
};

// Admins — full access to all modules + margin.
const ADMIN_ROLES: Role[] = ["CRO", "Sales Manager", "AE/QA"];

// §6 Margin wall: Buying Price & true margin visible only to
// CRO, Sales Manager, Head of Supply, and Rija (AE/QA).
const MARGIN_ROLES: Role[] = ["CRO", "Sales Manager", "Head of Supply", "AE/QA"];

// §3.5 Raghouse visibility: only Supply (Shahiq), Womenswear (Myra) and CRO
// (plus the AE/QA admin) can see/set the raghouse source.
const RAGHOUSE_ROLES: Role[] = ["CRO", "Head of Supply", "Womenswear", "AE/QA"];

// Module access for navigation / route guards.
const SUPPLY_ROLES: Role[] = ["CRO", "Sales Manager", "AE/QA", "Head of Supply", "Womenswear"];
const LOGISTICS_ROLES: Role[] = ["CRO", "Sales Manager", "AE/QA", "Head of Supply", "Logistics Coordinator"];
const SALES_ROLES: Role[] = [
  "CRO", "Sales Manager", "AE/QA", "AE", "AE (Probation)", "BDR", "Lead Gen/CRM",
];

export function isAdmin(role: string): boolean {
  return ADMIN_ROLES.includes(role as Role);
}
export function canSeeMargin(role: string): boolean {
  return MARGIN_ROLES.includes(role as Role);
}
export function canSeeRaghouse(role: string): boolean {
  return RAGHOUSE_ROLES.includes(role as Role);
}
export function canAccessSales(role: string): boolean {
  return SALES_ROLES.includes(role as Role);
}
export function canAccessSupply(role: string): boolean {
  return SUPPLY_ROLES.includes(role as Role);
}
export function canAccessLogistics(role: string): boolean {
  return LOGISTICS_ROLES.includes(role as Role);
}

// §7 Pricing authority — who can approve a sub-floor (5%) markup.
export function canApprovePricing(role: string): boolean {
  return role === "CRO" || role === "AE/QA";
}

// §9 freight auto-derivation (also automation #9).
export function deriveOrderType(units: number): "Air" | "LCL" | "FCL" {
  if (units < 1000) return "Air";
  if (units <= 5000) return "LCL";
  return "FCL";
}
