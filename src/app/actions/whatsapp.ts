"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { sendWhatsAppText, logWhatsAppMessage, whatsappConfigured } from "@/lib/whatsapp";

async function guard() {
  const user = await requireUser();
  if (!canAccessSales(user.role)) throw new Error("FORBIDDEN");
  return user;
}

// Send a WhatsApp message from a contact's timeline. Logs the outbound message
// either way; reports whether it actually went out via the Cloud API.
export async function sendWhatsAppAction(input: {
  companyId: string; dealId?: string; contactId?: string; toNumber: string; body: string;
}): Promise<{ sentVia: "whatsapp" | "logged" | "none"; error?: string }> {
  const user = await guard();
  const body = input.body.trim();
  if (!body) return { sentVia: "none" };

  let sentVia: "whatsapp" | "logged" = "logged";
  let error: string | undefined;
  let waMessageId: string | undefined;

  if (whatsappConfigured() && input.toNumber) {
    const r = await sendWhatsAppText(input.toNumber, body);
    if (r.ok) { sentVia = "whatsapp"; waMessageId = r.id; } else { error = r.error; }
  }

  await logWhatsAppMessage({
    waMessageId, direction: "outbound", body,
    fromNumber: "business", toNumber: input.toNumber || "—",
    contactId: input.contactId, companyId: input.companyId, dealId: input.dealId,
    agent: user.name, status: sentVia === "whatsapp" ? "sent" : undefined,
  }).catch(() => {});

  revalidatePath("/companies");
  revalidatePath("/contacts");
  if (input.companyId) revalidatePath(`/companies/${input.companyId}`);
  if (input.contactId) revalidatePath(`/contacts/${input.contactId}`);
  return { sentVia, error };
}
