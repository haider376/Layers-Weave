import "server-only";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

// Canonical team roster — single source of truth for who's a member, their role
// and title. Applied to the live DB by syncRoster() (non-destructive upserts).
export const ROSTER = [
  { email: "oliver@layerswholesale.co", name: "Oliver Bennett", role: "CEO", title: "Chief Executive Officer" },
  { email: "haider@layerswholesale.co", name: "Haider Ali Rana", role: "CRO", title: "Chief Revenue Officer" },
  { email: "zikriya@layerswholesale.co", name: "Zikriya Abbasi", role: "Sales Manager", title: "Sales Manager" },
  { email: "rija@layerswholesale.co", name: "Rija Fatima", role: "AE/QA", title: "Account Executive / QA" },
  { email: "kamila@layerswholesale.co", name: "Kamila Batool", role: "AE", title: "Account Executive" },
  { email: "asjad@layerswholesale.co", name: "Asjad Malik", role: "AE", title: "Account Executive" },
  { email: "adan@layerswholesale.co", name: "Adan Khalid", role: "AE", title: "Account Executive" },
  { email: "huzaifa@layerswholesale.co", name: "Huzaifa Asad", role: "BDR", title: "Business Development Rep" },
  { email: "fatima@layerswholesale.co", name: "Fatima Khan", role: "BDR", title: "Business Development Rep" },
  { email: "haya@layerswholesale.co", name: "Hayaa Malik", role: "BDR", title: "Business Development Rep" },
  { email: "shahzaib@layerswholesale.co", name: "Shahzaib Rana", role: "Lead Gen/CRM", title: "Lead Gen / CRM" },
];

// Members removed from the team. Their owned records are reassigned, then the
// account is deactivated (kept, not deleted, to avoid orphaning history).
export const DEACTIVATE = ["hilmand@layerswholesale.co"];
const REASSIGN_TO = "asjad@layerswholesale.co"; // active AE who inherits removed reps' accounts

const ROSTER_FLAG = "roster-synced-v3";

export async function syncRoster() {
  const passwordHash = await bcrypt.hash("password", 10);
  const created: string[] = [];
  const updated: string[] = [];

  for (const m of ROSTER) {
    const existing = await prisma.user.findUnique({ where: { email: m.email } }).catch(() => null);
    if (existing) {
      await prisma.user.update({ where: { email: m.email }, data: { name: m.name, role: m.role, title: m.title, active: true } });
      updated.push(m.email);
    } else {
      await prisma.user.create({ data: { email: m.email, name: m.name, role: m.role, title: m.title, active: true, passwordHash } });
      created.push(m.email);
    }
  }

  // Reassign + deactivate removed members so they vanish from the CRM.
  const heir = await prisma.user.findUnique({ where: { email: REASSIGN_TO } }).catch(() => null);
  const deactivated: string[] = [];
  for (const email of DEACTIVATE) {
    const u = await prisma.user.findUnique({ where: { email } }).catch(() => null);
    if (!u) continue;
    if (heir) {
      await prisma.company.updateMany({ where: { ownerId: u.id }, data: { ownerId: heir.id } }).catch(() => {});
      await prisma.company.updateMany({ where: { bdrId: u.id }, data: { bdrId: heir.id } }).catch(() => {});
      await prisma.deal.updateMany({ where: { ownerId: u.id }, data: { ownerId: heir.id } }).catch(() => {});
      await prisma.salesMeeting.updateMany({ where: { aeId: u.id }, data: { aeId: heir.id } }).catch(() => {});
    }
    await prisma.user.update({ where: { id: u.id }, data: { active: false } }).catch(() => {});
    deactivated.push(email);
  }

  return { created, updated, deactivated };
}

// Runs syncRoster() once per deploy generation (guarded by an AppSetting flag),
// so the roster self-heals on the first admin page load — no manual endpoint.
export async function ensureRosterSynced(): Promise<void> {
  try {
    const flag = await prisma.appSetting.findUnique({ where: { key: ROSTER_FLAG } });
    if (flag) return;
    await syncRoster();
    await prisma.appSetting.upsert({ where: { key: ROSTER_FLAG }, create: { key: ROSTER_FLAG, value: new Date().toISOString() }, update: { value: new Date().toISOString() } });
  } catch { /* DB not ready — try again next load */ }
}
