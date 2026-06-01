import "server-only";
import crypto from "crypto";
import { prisma } from "./db";

// ── Zoom Phone — Server-to-Server OAuth (account-level) ─────────────────────
//
// Setup (see SETUP-ZOOM.md):
//   ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET  — from the S2S app
//   ZOOM_WEBHOOK_SECRET                                  — webhook Secret Token
//
// Account-level: ONE connection for the whole team (no per-rep OAuth). The
// webhook auto-logs calls; click-to-call places calls on behalf of the rep
// (matched to their Zoom user by email).

const TOKEN_URL = "https://zoom.us/oauth/token";

export function zoomConfigured(): boolean {
  return !!(process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET);
}

function basicAuth(): string {
  return Buffer.from(`${(process.env.ZOOM_CLIENT_ID ?? "").trim()}:${(process.env.ZOOM_CLIENT_SECRET ?? "").trim()}`).toString("base64");
}

// Cache the account token in-process (valid ~1h) to avoid re-minting per call.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccountToken(): Promise<string | null> {
  if (!zoomConfigured()) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  const body = new URLSearchParams({ grant_type: "account_credentials", account_id: (process.env.ZOOM_ACCOUNT_ID ?? "").trim() });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { authorization: `Basic ${basicAuth()}`, "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const tok = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: tok.access_token, expiresAt: Date.now() + (tok.expires_in - 120) * 1000 };
  return tok.access_token;
}

export type ZoomConn = { connected: boolean; accountEmail: string | null };

// Live token-mint probe that returns Zoom's actual error (for diagnostics).
export async function zoomTokenProbe(): Promise<{ ok: boolean; httpStatus?: number; error?: string }> {
  if (!zoomConfigured()) return { ok: false, error: "missing env vars" };
  const body = new URLSearchParams({ grant_type: "account_credentials", account_id: (process.env.ZOOM_ACCOUNT_ID ?? "").trim() });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { authorization: `Basic ${basicAuth()}`, "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, httpStatus: res.status, error: text.slice(0, 300) };
  return { ok: true, httpStatus: res.status };
}

// Account-level: "connected" simply means the env credentials are present and a
// token can be minted. Verifies live so the UI reflects reality.
export async function zoomGetConnection(): Promise<ZoomConn> {
  if (!zoomConfigured()) return { connected: false, accountEmail: null };
  const token = await getAccountToken().catch(() => null);
  return { connected: !!token, accountEmail: token ? "Account-level (Server-to-Server)" : null };
}

// Look up a Zoom user id by email (needed to place a call on their behalf).
async function zoomUserId(email: string): Promise<string | null> {
  const token = await getAccountToken();
  if (!token) return null;
  const res = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(email)}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return ((await res.json()) as { id?: string }).id ?? null;
}

// Place a click-to-call on behalf of the rep (matched by their CRM email).
// Rings the rep's Zoom Phone, which then dials the callee.
export async function zoomPlaceCall(repEmail: string, calleeNumber: string): Promise<{ ok: boolean; callId?: string; error?: string }> {
  const token = await getAccountToken();
  if (!token) return { ok: false, error: "not configured" };
  const number = calleeNumber.replace(/[^\d+]/g, "");
  if (!number) return { ok: false, error: "no number" };
  const uid = await zoomUserId(repEmail);
  if (!uid) return { ok: false, error: "no zoom user for " + repEmail };
  const res = await fetch(`https://api.zoom.us/v2/phone/users/${uid}/call_out`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ callee: { phone_number: number } }),
  });
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
  const data = (await res.json().catch(() => ({}))) as { call_id?: string };
  return { ok: true, callId: data.call_id };
}

// ── Webhook signature verification (Zoom v2) ────────────────────────────────
function webhookSecret(): string {
  return (process.env.ZOOM_WEBHOOK_SECRET ?? "").trim();
}

export function zoomVerifySignature(rawBody: string, signature: string | null, timestamp: string | null): boolean {
  const secret = webhookSecret();
  if (!secret || !signature || !timestamp) return false;
  const message = `v0:${timestamp}:${rawBody}`;
  const expected = "v0=" + crypto.createHmac("sha256", secret).update(message).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function zoomUrlValidation(plainToken: string): { plainToken: string; encryptedToken: string } {
  const encryptedToken = crypto.createHmac("sha256", webhookSecret()).update(plainToken).digest("hex");
  return { plainToken, encryptedToken };
}

// Match a phone number to a Contact (loose match on trailing digits).
export async function matchContactByNumber(number: string): Promise<{ id: string; companyId: string } | null> {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 6) return null;
  const tail = digits.slice(-9);
  const contacts = await prisma.contact.findMany({ where: { phone: { not: null } }, select: { id: true, companyId: true, phone: true }, take: 2000 });
  for (const c of contacts) {
    const cd = (c.phone ?? "").replace(/\D/g, "");
    if (cd && (cd.endsWith(tail) || tail.endsWith(cd.slice(-9)))) return { id: c.id, companyId: c.companyId };
  }
  return null;
}

// Auto-log a completed Zoom call (called from the webhook).
export async function logZoomCall(input: {
  zoomCallId: string; number: string; direction: string; durationSec?: number; recordingUrl?: string; agentEmail?: string;
}): Promise<void> {
  const exists = await prisma.callLog.findUnique({ where: { zoomCallId: input.zoomCallId } }).catch(() => null);
  if (exists) return;

  const match = await matchContactByNumber(input.number);
  if (!match) return;

  let agent: string | undefined;
  if (input.agentEmail) {
    const u = await prisma.user.findUnique({ where: { email: input.agentEmail } }).catch(() => null);
    agent = u?.name;
  }
  await prisma.callLog.create({
    data: {
      contactId: match.id,
      companyId: match.companyId,
      number: input.number,
      direction: input.direction === "inbound" ? "inbound" : "outbound",
      via: "Zoom Phone",
      connected: (input.durationSec ?? 0) > 5,
      outcome: "Logged (Zoom)",
      durationSec: input.durationSec,
      recordingUrl: input.recordingUrl,
      zoomCallId: input.zoomCallId,
      agent,
    },
  });
  await prisma.company.update({ where: { id: match.companyId }, data: { lastContacted: new Date() } }).catch(() => {});
}
