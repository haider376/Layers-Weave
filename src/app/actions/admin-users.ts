"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureCadenceSchema } from "@/lib/ensureCadenceSchema";
import { emailDomainAllowed } from "@/lib/auth";

async function guardAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw new Error("FORBIDDEN");
  return user;
}

// Prod DBs may lack the new columns until healed — run once, then retry the op.
async function withUserSchema<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
    if (msg.includes("managedpassword") || msg.includes("phone") || msg.includes("column") || (e as { code?: string }).code === "42703") {
      await ensureCadenceSchema();
      return await fn();
    }
    throw e;
  }
}

function validPassword(p: string): string {
  const s = (p ?? "").trim();
  if (s.length < 6) throw new Error("Password must be at least 6 characters");
  return s;
}

// ── Self-service: any signed-in user changes their OWN password ──────────────
export async function changeMyPasswordAction(input: { current: string; next: string }): Promise<{ ok: true }> {
  const me = await requireUser();
  const next = validPassword(input.next);
  const row = await prisma.user.findUnique({ where: { id: me.id } });
  if (!row) throw new Error("Not found");
  const ok = await bcrypt.compare(input.current ?? "", row.passwordHash);
  if (!ok) throw new Error("Current password is incorrect");
  const passwordHash = await bcrypt.hash(next, 10);
  await withUserSchema(() => prisma.user.update({ where: { id: me.id }, data: { passwordHash, managedPassword: next } }));
  return { ok: true };
}

// ── Admin: create a user ─────────────────────────────────────────────────────
export async function adminCreateUserAction(input: {
  name: string; email: string; role: string; title?: string; phone?: string; password: string;
}): Promise<{ ok: true; id: string }> {
  await guardAdmin();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = validPassword(input.password);
  if (!name) throw new Error("Name is required");
  if (!emailDomainAllowed(email)) throw new Error("Email must be on an allowed company domain");
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error("A user with that email already exists");
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await withUserSchema(() => prisma.user.create({
    data: { name, email, role: input.role, title: input.title?.trim() || input.role, phone: input.phone?.trim() || null, passwordHash, managedPassword: password, active: true },
  }));
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true, id: created.id };
}

// ── Admin: update a user's profile fields ────────────────────────────────────
export async function adminUpdateUserAction(userId: string, input: {
  name?: string; email?: string; role?: string; title?: string; phone?: string;
}): Promise<{ ok: true }> {
  await guardAdmin();
  const data: Record<string, string | null> = {};
  if (input.name?.trim()) data.name = input.name.trim();
  if (input.role?.trim()) data.role = input.role.trim();
  if (input.title !== undefined) data.title = input.title.trim() || (input.role ?? "");
  if (input.phone !== undefined) data.phone = input.phone.trim() || null;
  if (input.email?.trim()) {
    const email = input.email.trim().toLowerCase();
    if (!emailDomainAllowed(email)) throw new Error("Email must be on an allowed company domain");
    const clash = await prisma.user.findUnique({ where: { email } });
    if (clash && clash.id !== userId) throw new Error("Another user already has that email");
    data.email = email;
  }
  await withUserSchema(() => prisma.user.update({ where: { id: userId }, data }));
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Admin: set/reset a user's password ───────────────────────────────────────
export async function adminSetPasswordAction(userId: string, password: string): Promise<{ ok: true }> {
  await guardAdmin();
  const p = validPassword(password);
  const passwordHash = await bcrypt.hash(p, 10);
  await withUserSchema(() => prisma.user.update({ where: { id: userId }, data: { passwordHash, managedPassword: p } }));
  revalidatePath("/settings");
  return { ok: true };
}

// ── Admin: set a user's photo ────────────────────────────────────────────────
export async function adminSetAvatarAction(userId: string, dataUrl: string): Promise<{ ok: true }> {
  await guardAdmin();
  if (dataUrl.length > 1_500_000) throw new Error("Image too large");
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl: dataUrl } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Admin: deactivate / reactivate (safe "remove" — keeps history) ───────────
export async function adminSetActiveAction(userId: string, active: boolean): Promise<{ ok: true }> {
  const me = await guardAdmin();
  if (userId === me.id && !active) throw new Error("You can't deactivate your own account");
  await prisma.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ── Admin: hard-delete (only when the user owns no records) ───────────────────
export async function adminDeleteUserAction(userId: string): Promise<{ ok: true }> {
  const me = await guardAdmin();
  if (userId === me.id) throw new Error("You can't delete your own account");
  const owned = await prisma.company.count({ where: { OR: [{ ownerId: userId }, { bdrId: userId }] } })
    + await prisma.deal.count({ where: { ownerId: userId } });
  if (owned > 0) throw new Error("This user owns records — deactivate instead, or reassign their accounts first");
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
