"use server";

import { requireUser } from "@/lib/auth";
import { zoomPlaceCall, zoomConfigured } from "@/lib/zoom";

// Place a click-to-call via the account's Zoom Phone, on behalf of the signed-in
// rep (matched to their Zoom user by email). Falls back to tel: if unavailable.
export async function zoomCallAction(number: string): Promise<{ placed: boolean; error?: string }> {
  const user = await requireUser();
  if (!zoomConfigured()) return { placed: false, error: "not configured" };
  const r = await zoomPlaceCall(user.email, number);
  return { placed: r.ok, error: r.error };
}
