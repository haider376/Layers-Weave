import "server-only";
import crypto from "crypto";
import { prisma } from "./db";
import { ensureCadenceSchema, isMissingTable } from "./ensureCadenceSchema";
import { appOrigin } from "./google";

// ── Zoom Phone OAuth + click-to-call + webhook helpers ──────────────────────
//
// Setup (see SETUP-ZOOM.md):
//   ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET   — from a Zoom Marketplace OAuth app
//   ZOOM_WEBHOOK_SECRET                  — Secret Token for the webhook (auto-log)
//
// Per-user OAuth (each rep connects their own Zoom Phone), mirroring Google.

const PROVIDER = "zoom";
const AUTH_URL = "https://zoom.us/oauth/authorize";
const TOKEN_URL = "https://zoom.us/oauth/token";
// Scopes: read user + place click-to-call. Granular scopes (Zoom's newer model).
const SCOPES = ["user:read:user", "phone:read:user", "phone:write:callout_call"];

async function withSchema<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e) { if (isMissingTable(e)) { await ensureCadenceSchema(); return await fn(); } throw e; }
}

export function zoomConfigured(): boolean {
  return !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET);
}

export function zoomRedirectUri(): string {
  return `${appOrigin()}/api/integrations/zoom/callback`;
}

export function zoomAuthUrl(state: string): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ZOOM_CLIENT_ID!,
    redirect_uri: zoomRedirectUri(),
    state,
    scope: SCOPES.join(" "),
  });
  return `${AUTH_URL}?${p.toString()}`;
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; scope?: string };

function basicAuth(): string {
  return Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64");
}

// Exchange auth code → tokens, fetch the Zoom account email, persist.
export async function zoomExchangeAndStore(code: string, userId: string): Promise<void> {
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: zoomRedirectUri() });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { authorization: `Basic ${basicAuth()}`, "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Zoom token exchange failed: ${res.status} ${await res.text()}`);
  const tok = (await res.json()) as TokenResponse;
  const expiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000);

  // Get the connected Zoom user's email (for display + webhook matching).
  let email: string | null = null;
  try {
    const me = await fetch("https://api.zoom.us/v2/users/me", { headers: { authorization: `Bearer ${tok.access_token}` } });
    if (me.ok) email = ((await me.json()) as { email?: string }).email ?? null;
  } catch { /* best effort */ }

  await withSchema(() => prisma.integration.upsert({
    where: { userId_provider: { userId, provider: PROVIDER } },
    create: { userId, provider: PROVIDER, accessToken: tok.access_token, refreshToken: tok.refresh_token, expiresAt, scope: tok.scope, accountEmail: email },
    update: { accessToken: tok.access_token, ...(tok.refresh_token ? { refreshToken: tok.refresh_token } : {}), expiresAt, scope: tok.scope, ...(email ? { accountEmail: email } : {}) },
  }));
}

export type ZoomConn = { connected: boolean; accountEmail: string | null };

export async function zoomGetConnection(userId: string): Promise<ZoomConn> {
  const row = await prisma.integration.findUnique({ where: { userId_provider: { userId, provider: PROVIDER } } }).catch(() => null);
  return { connected: !!row, accountEmail: row?.accountEmail ?? null };
}

export async function zoomDisconnect(userId: string): Promise<void> {
  await prisma.integration.deleteMany({ where: { userId, provider: PROVIDER } });
}

async function zoomFreshToken(userId: string): Promise<string | null> {
  const row = await prisma.integration.findUnique({ where: { userId_provider: { userId, provider: PROVIDER } } }).catch(() => null);
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() > Date.now()) return row.accessToken;
  if (!row.refreshToken) return row.accessToken;

  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: row.refreshToken });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { authorization: `Basic ${basicAuth()}`, "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const tok = (await res.json()) as TokenResponse;
  const expiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000);
  await prisma.integration.update({ where: { id: row.id }, data: { accessToken: tok.access_token, ...(tok.refresh_token ? { refreshToken: tok.refresh_token } : {}), expiresAt } });
  return tok.access_token;
}

// Place a click-to-call: rings the rep's Zoom Phone app, which then dials the
// callee. (Zoom calls this "callout" — the rep's device rings first.)
export async function zoomPlaceCall(userId: string, calleeNumber: string): Promise<{ ok: boolean; callId?: string; error?: string }> {
  const token = await zoomFreshToken(userId);
  if (!token) return { ok: false, error: "not connected" };
  const number = calleeNumber.replace(/[^\d+]/g, "");
  if (!number) return { ok: false, error: "no number" };
  const res = await fetch("https://api.zoom.us/v2/phone/users/me/call_out", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ callee: { phone_number: number } }),
  });
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
  const data = (await res.json().catch(() => ({}))) as { call_id?: string };
  return { ok: true, callId: data.call_id };
}

// ── Webhook signature verification (Zoom v2) ────────────────────────────────
// Zoom signs: "v0:{timestamp}:{rawBody}" with HMAC-SHA256(secret) → "v0={hex}".
// Trim the secret defensively — a stray newline/space from a Vercel paste would
// otherwise silently break the HMAC and fail Zoom's validation.
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

// Zoom's URL-validation challenge response.
export function zoomUrlValidation(plainToken: string): { plainToken: string; encryptedToken: string } {
  const encryptedToken = crypto.createHmac("sha256", webhookSecret()).update(plainToken).digest("hex");
  return { plainToken, encryptedToken };
}

// Match a phone number to a Contact (loose match on the trailing digits).
export async function matchContactByNumber(number: string): Promise<{ id: string; companyId: string } | null> {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 6) return null;
  const tail = digits.slice(-9); // match last 9 digits (ignores country-code variance)
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
  if (exists) return; // dedup

  const match = await matchContactByNumber(input.number);
  if (!match) return; // unknown number — skip (avoids orphan call logs)

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
