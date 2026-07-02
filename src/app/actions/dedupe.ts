"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { findCompanyDuplicates, findContactDuplicates, mergeCompanies, mergeContacts, type DupeGroup } from "@/lib/dedupe";

// Scanning is read-only → any sales user may look for duplicates.
async function guardScan() {
  const user = await requireUser();
  if (!canAccessSales(user.role)) throw new Error("FORBIDDEN");
  return user;
}
// Merging is DESTRUCTIVE (deletes records) → admins only.
async function guardMerge() {
  const user = await requireUser();
  if (!user.isAdmin) throw new Error("FORBIDDEN");
  return user;
}

// Only allow dupeIds that the server itself agrees are duplicates of masterId —
// never trust the client to name which records get deleted. Re-scan, find the
// group that actually contains masterId, and intersect.
function verifiedDupes(groups: DupeGroup[], masterId: string, requested: string[]): string[] {
  const group = groups.find((g) => g.records.some((r) => r.id === masterId));
  if (!group) return [];
  const allowed = new Set(group.records.map((r) => r.id));
  return requested.filter((id) => id !== masterId && allowed.has(id));
}

export async function scanCompanyDuplicatesAction(): Promise<DupeGroup[]> {
  await guardScan();
  return findCompanyDuplicates();
}

export async function scanContactDuplicatesAction(): Promise<DupeGroup[]> {
  await guardScan();
  return findContactDuplicates();
}

export async function mergeCompaniesAction(masterId: string, dupeIds: string[]) {
  await guardMerge();
  const safe = verifiedDupes(await findCompanyDuplicates(), masterId, dupeIds);
  if (!safe.length) throw new Error("No verified duplicates for that master record");
  const r = await mergeCompanies(masterId, safe);
  revalidatePath("/companies");
  revalidatePath("/contacts");
  return r;
}

export async function mergeContactsAction(masterId: string, dupeIds: string[]) {
  await guardMerge();
  const safe = verifiedDupes(await findContactDuplicates(), masterId, dupeIds);
  if (!safe.length) throw new Error("No verified duplicates for that master record");
  const r = await mergeContacts(masterId, safe);
  revalidatePath("/contacts");
  revalidatePath("/companies");
  return r;
}
