"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { findCompanyDuplicates, findContactDuplicates, mergeCompanies, mergeContacts, type DupeGroup } from "@/lib/dedupe";

async function guard() {
  const user = await requireUser();
  if (!canAccessSales(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export async function scanCompanyDuplicatesAction(): Promise<DupeGroup[]> {
  await guard();
  return findCompanyDuplicates();
}

export async function scanContactDuplicatesAction(): Promise<DupeGroup[]> {
  await guard();
  return findContactDuplicates();
}

export async function mergeCompaniesAction(masterId: string, dupeIds: string[]) {
  await guard();
  const r = await mergeCompanies(masterId, dupeIds);
  revalidatePath("/companies");
  revalidatePath("/contacts");
  return r;
}

export async function mergeContactsAction(masterId: string, dupeIds: string[]) {
  await guard();
  const r = await mergeContacts(masterId, dupeIds);
  revalidatePath("/contacts");
  revalidatePath("/companies");
  return r;
}
