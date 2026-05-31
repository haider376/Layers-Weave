"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { disconnect, createGoogleEvent, getConnection } from "@/lib/google";

export async function disconnectGoogleAction() {
  const user = await requireUser();
  await disconnect(user.id);
  revalidatePath("/calendar");
  revalidatePath("/settings");
  return { ok: true };
}

// Create a calendar event. If the user has connected Google Calendar, push it
// there (with attendees + invites). Returns connection state so the UI can fall
// back to a local task when not connected.
export async function createCalendarEventAction(input: {
  title: string; date: string; time: string; durationMin: number; invitees: string[];
}): Promise<{ pushedToGoogle: boolean; htmlLink?: string; error?: string }> {
  const user = await requireUser();
  const conn = await getConnection(user.id);
  if (!conn.connected) return { pushedToGoogle: false };

  const start = new Date(`${input.date}T${input.time}`);
  const end = new Date(start.getTime() + input.durationMin * 60000);
  const r = await createGoogleEvent(user.id, {
    title: input.title,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    attendees: input.invitees,
  });
  revalidatePath("/calendar");
  if (!r.ok) return { pushedToGoogle: false, error: r.error };
  return { pushedToGoogle: true, htmlLink: r.htmlLink };
}
