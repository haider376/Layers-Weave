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
  zoomCallId: string; number: string; direction: string; durationSec?: number; recordingUrl?: string; agentEmail?: string; agentName?: string;
}): Promise<void> {
  // Already logged this exact Zoom call? (idempotent — Zoom retries webhooks.)
  const exists = await prisma.callLog.findUnique({ where: { zoomCallId: input.zoomCallId } }).catch(() => null);
  if (exists) {
    // A later recording_completed event for an already-logged call: attach the URL.
    if (input.recordingUrl && !exists.recordingUrl) {
      await prisma.callLog.update({ where: { id: exists.id }, data: { recordingUrl: input.recordingUrl } }).catch(() => {});
    }
    return;
  }

  const match = await matchContactByNumber(input.number);
  if (!match) return;

  // Resolve the rep — by email first, then by name (Zoom phone events give name).
  let agent: string | undefined;
  if (input.agentEmail) {
    const u = await prisma.user.findUnique({ where: { email: input.agentEmail } }).catch(() => null);
    agent = u?.name;
  }
  if (!agent && input.agentName) {
    const u = await prisma.user.findFirst({ where: { name: input.agentName } }).catch(() => null);
    agent = u?.name ?? input.agentName;
  }

  // If this is a recording arriving for a call the rep just logged manually,
  // attach it to that recent entry rather than creating a duplicate.
  if (input.recordingUrl) {
    const recent = await prisma.callLog.findFirst({
      where: {
        contactId: match.id,
        recordingUrl: null,
        zoomCallId: null,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => null);
    if (recent) {
      await prisma.callLog.update({
        where: { id: recent.id },
        data: {
          recordingUrl: input.recordingUrl,
          zoomCallId: input.zoomCallId,
          durationSec: recent.durationSec ?? input.durationSec,
          agent: recent.agent ?? agent,
        },
      }).catch(() => {});
      await prisma.company.update({ where: { id: match.companyId }, data: { lastContacted: new Date() } }).catch(() => {});
      return;
    }
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

// Extract the meaningful fields from a Zoom Phone call/recording webhook body and
// auto-log them. Shared by the live webhook and the debug replay endpoint.
// Returns what it parsed so callers can surface a diagnostic.
export async function processZoomCallEvent(body: Record<string, unknown>): Promise<{
  handled: boolean; number?: string; direction?: string; recordingUrl?: string; agent?: string; zoomCallId?: string;
}> {
  const event = String(body.event ?? "");
  if (event !== "phone.call_log_completed" && event !== "phone.recording_completed") return { handled: false };

  const payloadObj = (body.payload as { object?: Record<string, unknown> } | undefined)?.object ?? {};
  // recording_completed nests everything inside recordings[] / recording_files[].
  const recList = ([payloadObj.recordings, payloadObj.recording_files].find(Array.isArray) as Record<string, unknown>[] | undefined) ?? [];
  const obj: Record<string, unknown> = recList.length ? { ...payloadObj, ...recList[0] } : payloadObj;

  const direction = String(obj.direction ?? "outbound");
  const zoomCallId = String(obj.call_id ?? obj.id ?? obj.call_log_id ?? obj.call_history_id ?? obj.call_id_str ?? `${Date.now()}-${Math.random()}`);
  const duration = Number(obj.duration ?? obj.call_duration ?? 0) || undefined;

  let recordingUrl =
    (obj.download_url as string | undefined) ?? (obj.recording_url as string | undefined) ??
    (obj.play_url as string | undefined) ?? (obj.file_url as string | undefined);
  for (const r of recList) {
    recordingUrl = recordingUrl ?? (r.download_url as string | undefined) ?? (r.play_url as string | undefined) ?? (r.file_url as string | undefined);
  }

  // External party: prefer E.164 *_did_number over internal extensions.
  const calleeDid = obj.callee_did_number as string | undefined;
  const callerDid = obj.caller_did_number as string | undefined;
  const callee = (obj.callee as { phone_number?: string } | undefined)?.phone_number ?? (obj.callee_number as string | undefined);
  const caller = (obj.caller as { phone_number?: string } | undefined)?.phone_number ?? (obj.caller_number as string | undefined);
  const number = direction === "inbound"
    ? (callerDid ?? caller ?? calleeDid ?? callee ?? "")
    : (calleeDid ?? callee ?? callerDid ?? caller ?? "");

  const agentEmail = (obj.owner as { email?: string } | undefined)?.email ?? (obj.user_email as string | undefined) ?? (obj.email as string | undefined);
  const agentName = (obj.owner as { name?: string } | undefined)?.name ?? (direction === "inbound" ? (obj.callee_name as string | undefined) : (obj.caller_name as string | undefined));

  if (!number) return { handled: false, direction, recordingUrl, zoomCallId };
  await logZoomCall({ zoomCallId, number, direction, durationSec: duration, recordingUrl, agentEmail, agentName });
  return { handled: true, number, direction, recordingUrl, agent: agentName, zoomCallId };
}
