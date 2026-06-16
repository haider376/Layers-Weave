import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only, NON-destructive roster sync — applies team changes to the live DB
// without re-seeding (which would wipe imported data). Upserts each canonical
// member by email, fixes roles/titles, and deactivates anyone removed from the
// team. Safe to run repeatedly. Visit while signed in as an admin:
//   /api/admin/sync-roster
const ROSTER = [
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

// Members removed from the team — deactivated rather than deleted, so any
// records they own aren't orphaned.
const DEACTIVATE = ["hilmand@layerswholesale.co"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });

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

  const deactivated: string[] = [];
  for (const email of DEACTIVATE) {
    const r = await prisma.user.updateMany({ where: { email }, data: { active: false } }).catch(() => ({ count: 0 }));
    if (r.count) deactivated.push(email);
  }

  return NextResponse.json({ ok: true, created, updated, deactivated, note: "New members sign in with the default password 'password' and can change it in Settings." });
}
