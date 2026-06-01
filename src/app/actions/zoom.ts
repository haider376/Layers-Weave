"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { zoomDisconnect, zoomPlaceCall, zoomGetConnection } from "@/lib/zoom";

export async function disconnectZoomAction() {
  const user = await requireUser();
  await zoomDisconnect(user.id);
  revalidatePath("/calls");
  revalidatePath("/settings");
  return { ok: true };
}

// Place a click-to-call via the rep's connected Zoom Phone. If not connected,
// the caller falls back to a tel: link.
export async function zoomCallAction(number: string): Promise<{ placed: boolean; error?: string }> {
  const user = await requireUser();
  const conn = await zoomGetConnection(user.id).catch(() => ({ connected: false, accountEmail: null }));
  if (!conn.connected) return { placed: false, error: "not connected" };
  const r = await zoomPlaceCall(user.id, number);
  return { placed: r.ok, error: r.error };
}
