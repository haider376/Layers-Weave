import "server-only";
import crypto from "crypto";
import { prisma } from "./db";
import { ensureCadenceSchema, isMissingTable } from "./ensureCadenceSchema";

// ── WhatsApp Business — client comms (Meta Cloud API, account-level) ─────────
//
// Setup (see SETUP-WHATSAPP.md):
//   WHATSAPP_PHONE_NUMBER_ID   — the sending number's ID (Meta › WhatsApp › API setup)
//   WHATSAPP_ACCESS_TOKEN      — permanent token of a system user with whatsapp perms
//   WHATSAPP_VERIFY_TOKEN      — any string you choose; echoed back on webhook setup
//   WHATSAPP_APP_SECRET        — (recommended) Meta app secret, verifies inbound POSTs
//
// One business number for the whole team. Outbound sends from a contact's
// timeline; inbound replies auto-log to that contact. Free-form text is only
// allowed inside the 24h customer-service window; outside it, use a template.

const GRAPH = "https://graph.facebook.com/v21.0";

function phoneNumberId(): string { return (process.env.WHATSAPP_PHONE_NUMBER_ID ?? "").trim(); }
function accessToken(): string { return (process.env.WHATSAPP_ACCESS_TOKEN ?? "").trim(); }
function verifyToken(): string { return (process.env.WHATSAPP_VERIFY_TOKEN ?? "").trim(); }
function appSecret(): string { return (process.env.WHATSAPP_APP_SECRET ?? "").trim(); }

export function whatsappConfigured(): boolean {
  return !!phoneNumberId() && !!accessToken();
}

async function withSchema<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e) { if (isMissingTable(e) || isMissingColumn(e)) { await ensureCadenceSchema(); return await fn(); } throw e; }
}
function isMissingColumn(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return code === "42703" || (msg.includes("column") && msg.includes("does not exist"));
}

// Normalise to digits only (E.164 without +) for the Cloud API `to` field.
function toWaNumber(raw: string): string { return raw.replace(/\D/g, ""); }

// ── Send ────────────────────────────────────────────────────────────────────
export async function sendWhatsAppText(to: string, body: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!whatsappConfigured()) return { ok: false, error: "not configured" };
  const num = toWaNumber(to);
  if (num.length < 7) return { ok: false, error: "invalid number" };
  try {
    const res = await fetch(`${GRAPH}/${phoneNumberId()}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken()}`, "content-type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: num, type: "text", text: { preview_url: true, body } }),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
    if (!res.ok) return { ok: false, error: json.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, id: json.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Inbound webhook ───────────────────────────────────────────────────────────
// GET handshake: echo hub.challenge when the verify token matches.
export function whatsappVerifyChallenge(params: URLSearchParams): { ok: boolean; challenge?: string } {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge") ?? "";
  if (mode === "subscribe" && token && token === verifyToken()) return { ok: true, challenge };
  return { ok: false };
}

// POST signature: Meta signs the raw body with the app secret (sha256).
// Fails CLOSED — with no app secret configured we reject every webhook rather
// than accept forged inbound messages. Set WHATSAPP_APP_SECRET to enable.
export function whatsappVerifySignature(rawBody: string, signature: string | null): boolean {
  const secret = appSecret();
  if (!secret) return false; // no app secret → reject (was: accept — fail-open)
  if (!signature) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)); }
  catch { return false; }
}

// Match an inbound number to a CRM contact (last-9-digit tail match, like Zoom).
export async function matchContactByWa(number: string): Promise<{ id: string; companyId: string; name: string } | null> {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 6) return null;
  const tail = digits.slice(-9);
  const contacts = await prisma.contact.findMany({ where: { phone: { not: null } }, select: { id: true, companyId: true, name: true, phone: true }, take: 5000 });
  for (const c of contacts) {
    const cd = (c.phone ?? "").replace(/\D/g, "");
    if (cd && (cd.endsWith(tail) || tail.endsWith(cd.slice(-9)))) return { id: c.id, companyId: c.companyId, name: c.name };
  }
  return null;
}

// Persist a WhatsApp message (inbound or outbound) + a timeline activity.
export async function logWhatsAppMessage(input: {
  waMessageId?: string; direction: "inbound" | "outbound"; body: string; fromNumber: string; toNumber: string;
  contactId?: string; companyId?: string; dealId?: string; agent?: string; status?: string;
}): Promise<void> {
  await withSchema(async () => {
    if (input.waMessageId) {
      const exists = await prisma.whatsAppMessage.findUnique({ where: { waMessageId: input.waMessageId } }).catch(() => null);
      if (exists) return;
    }
    await prisma.whatsAppMessage.create({
      data: {
        waMessageId: input.waMessageId ?? null,
        direction: input.direction,
        body: input.body,
        fromNumber: input.fromNumber,
        toNumber: input.toNumber,
        contactId: input.contactId ?? null,
        companyId: input.companyId ?? null,
        dealId: input.dealId ?? null,
        agent: input.agent ?? null,
        status: input.status ?? null,
      },
    });
  });
  if (input.companyId) {
    await prisma.company.update({ where: { id: input.companyId }, data: { lastContacted: new Date() } }).catch(() => {});
  }
}

// Process a Cloud API webhook body: log inbound messages against their contact.
export async function processWhatsAppWebhook(body: Record<string, unknown>): Promise<{ logged: number }> {
  let logged = 0;
  const entries = (body.entry as Array<Record<string, unknown>> | undefined) ?? [];
  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>> | undefined) ?? [];
    for (const change of changes) {
      const value = (change.value as Record<string, unknown> | undefined) ?? {};
      const metadata = value.metadata as { display_phone_number?: string; phone_number_id?: string } | undefined;
      const businessNumber = metadata?.display_phone_number ?? phoneNumberId();
      const messages = (value.messages as Array<Record<string, unknown>> | undefined) ?? [];
      for (const m of messages) {
        const from = String(m.from ?? "");
        const waId = m.id ? String(m.id) : undefined;
        const type = String(m.type ?? "text");
        const text = type === "text"
          ? String((m.text as { body?: string } | undefined)?.body ?? "")
          : `[${type} message]`;
        const match = await matchContactByWa(from);
        await logWhatsAppMessage({
          waMessageId: waId, direction: "inbound", body: text,
          fromNumber: from, toNumber: businessNumber,
          contactId: match?.id, companyId: match?.companyId,
        }).catch(() => {});
        logged++;
      }
    }
  }
  return { logged };
}

// Admin diagnostics — never leaks token values, only presence/lengths.
export function whatsappDiagnostics(origin: string) {
  return {
    configured: whatsappConfigured(),
    has_WHATSAPP_PHONE_NUMBER_ID: !!phoneNumberId(),
    WHATSAPP_PHONE_NUMBER_ID_length: phoneNumberId().length,
    has_WHATSAPP_ACCESS_TOKEN: !!accessToken(),
    WHATSAPP_ACCESS_TOKEN_length: accessToken().length,
    has_WHATSAPP_VERIFY_TOKEN: !!verifyToken(),
    has_WHATSAPP_APP_SECRET: !!appSecret(),
    signatureEnforced: !!appSecret(),
    webhookUrl: `${origin}/api/integrations/whatsapp/webhook`,
  };
}
