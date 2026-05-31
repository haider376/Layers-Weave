import "server-only";
import { prisma } from "./db";
import { ensureCadenceSchema, isMissingTable } from "./ensureCadenceSchema";

// Run a DB op; if the Integration table doesn't exist yet (deploy that skipped
// the migration), create the app's auxiliary tables and retry once.
async function withSchema<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (e) { if (isMissingTable(e)) { await ensureCadenceSchema(); return await fn(); } throw e; }
}

// ── Google Calendar OAuth + API (REST, no SDK dependency) ───────────────────
//
// Setup (see SETUP-GOOGLE-CALENDAR.md):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  — from Google Cloud Console
//   APP_URL (optional)                      — canonical https origin for the
//                                              OAuth redirect; auto-derived on
//                                              Vercel from VERCEL_URL otherwise.

const PROVIDER = "google-calendar"; // single Google connection: Calendar + Gmail
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "openid",
  "email",
];

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appOrigin(): string {
  // Accept a messy APP_URL (full path, trailing slash, etc.) and keep only the
  // scheme+host origin — so a pasted callback URL can't double up the path.
  const raw = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (raw) {
    try {
      const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
      return new URL(withScheme).origin;
    } catch {
      return raw.replace(/\/.*$/, "").replace(/\/$/, "");
    }
  }
  return "http://localhost:3000";
}

export function redirectUri(): string {
  return `${appOrigin()}/api/integrations/google/callback`;
}

export function authUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline", // get a refresh token
    prompt: "consent", // always return a refresh token
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${p.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
};

function decodeEmailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
    return json.email ?? null;
  } catch {
    return null;
  }
}

// Exchange the auth code for tokens and persist the connection for a user.
export async function exchangeCodeAndStore(code: string, userId: string): Promise<void> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const tok = (await res.json()) as TokenResponse;
  const email = decodeEmailFromIdToken(tok.id_token);
  const expiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000);

  await withSchema(() => prisma.integration.upsert({
    where: { userId_provider: { userId, provider: PROVIDER } },
    create: { userId, provider: PROVIDER, accessToken: tok.access_token, refreshToken: tok.refresh_token, expiresAt, scope: tok.scope, accountEmail: email },
    // Keep the existing refresh token if Google didn't send a new one.
    update: { accessToken: tok.access_token, ...(tok.refresh_token ? { refreshToken: tok.refresh_token } : {}), expiresAt, scope: tok.scope, ...(email ? { accountEmail: email } : {}) },
  }));
}

export type GoogleConn = { connected: boolean; accountEmail: string | null };

export async function getConnection(userId: string): Promise<GoogleConn> {
  const row = await prisma.integration.findUnique({ where: { userId_provider: { userId, provider: PROVIDER } } }).catch(() => null);
  return { connected: !!row, accountEmail: row?.accountEmail ?? null };
}

export async function disconnect(userId: string): Promise<void> {
  await prisma.integration.deleteMany({ where: { userId, provider: PROVIDER } });
}

// Return a valid access token, refreshing if it's expired.
async function freshAccessToken(userId: string): Promise<string | null> {
  const row = await prisma.integration.findUnique({ where: { userId_provider: { userId, provider: PROVIDER } } }).catch(() => null);
  if (!row) return null;
  if (row.expiresAt && row.expiresAt.getTime() > Date.now()) return row.accessToken;
  if (!row.refreshToken) return row.accessToken; // can't refresh; best effort

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: row.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) return null;
  const tok = (await res.json()) as TokenResponse;
  const expiresAt = new Date(Date.now() + (tok.expires_in - 60) * 1000);
  await prisma.integration.update({ where: { id: row.id }, data: { accessToken: tok.access_token, expiresAt } });
  return tok.access_token;
}

export type GCalEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end: string | null;
  allDay: boolean;
  htmlLink: string;
};

// Pull events from the user's primary calendar within a window.
export async function listGoogleEvents(userId: string, timeMin: Date, timeMax: Date): Promise<GCalEvent[]> {
  const token = await freshAccessToken(userId);
  if (!token) return [];
  const p = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${p.toString()}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: GoogleApiEvent[] };
  return (data.items ?? []).map((e) => ({
    id: e.id,
    title: e.summary ?? "(no title)",
    start: e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T00:00:00` : ""),
    end: e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00` : null),
    allDay: !e.start?.dateTime,
    htmlLink: e.htmlLink ?? "",
  })).filter((e) => e.start);
}

type GoogleApiEvent = {
  id: string;
  summary?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

// Admin diagnostics: what scopes were granted, token state, and a LIVE probe of
// the Calendar API so we can see the real error if events don't load.
export async function googleDiagnostics(userId: string): Promise<Record<string, unknown>> {
  const row = await prisma.integration.findUnique({ where: { userId_provider: { userId, provider: PROVIDER } } }).catch(() => null);
  if (!row) return { connected: false };

  const grantedScopes = (row.scope ?? "").split(" ").filter(Boolean);
  const hasCalRead = grantedScopes.some((s) => s.includes("calendar.readonly") || s.includes("calendar.events") || s.endsWith("/calendar"));
  const hasGmailSend = grantedScopes.some((s) => s.includes("gmail.send"));

  const token = await freshAccessToken(userId);
  let calProbe: Record<string, unknown> = { ran: false };
  if (token) {
    const now = new Date();
    const min = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const max = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
    const p = new URLSearchParams({ timeMin: min, timeMax: max, singleEvents: "true", orderBy: "startTime", maxResults: "10" });
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`, { headers: { authorization: `Bearer ${token}` } });
    const text = await res.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { /* keep raw */ }
    const items = (parsed as { items?: unknown[] } | null)?.items;
    calProbe = {
      ran: true,
      httpStatus: res.status,
      eventCount: Array.isArray(items) ? items.length : 0,
      // surface Google's error body (e.g. insufficient scope) when not 200
      error: res.ok ? null : (text.slice(0, 400)),
    };
  }

  return {
    connected: true,
    accountEmail: row.accountEmail,
    grantedScopes,
    hasCalendarScope: hasCalRead,
    hasGmailSendScope: hasGmailSend,
    hasRefreshToken: !!row.refreshToken,
    accessTokenExpired: row.expiresAt ? row.expiresAt.getTime() < Date.now() : null,
    gotFreshToken: !!token,
    calendarProbe: calProbe,
  };
}

// Create an event on the user's primary calendar (with optional attendees).
export async function createGoogleEvent(userId: string, input: {
  title: string; startISO: string; endISO: string; attendees?: string[];
}): Promise<{ ok: boolean; htmlLink?: string; error?: string }> {
  const token = await freshAccessToken(userId);
  if (!token) return { ok: false, error: "not connected" };
  const validEmails = (input.attendees ?? []).filter((a) => /\S+@\S+\.\S+/.test(a)).map((email) => ({ email }));
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      summary: input.title,
      start: { dateTime: input.startISO },
      end: { dateTime: input.endISO },
      ...(validEmails.length ? { attendees: validEmails } : {}),
    }),
  });
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
  const data = (await res.json()) as { htmlLink?: string };
  return { ok: true, htmlLink: data.htmlLink };
}

// ── Gmail send ──────────────────────────────────────────────────────────────
// base64url with no padding, as the Gmail API expects.
function b64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Encode a header value that may contain non-ASCII (RFC 2047).
function encodeHeader(v: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`;
}

// Send an email as the connected Gmail account. Returns ok + the gmail thread id.
export async function sendGmail(userId: string, input: {
  to: string; subject: string; body: string; fromName?: string;
}): Promise<{ ok: boolean; threadId?: string; error?: string }> {
  const token = await freshAccessToken(userId);
  if (!token) return { ok: false, error: "not connected" };
  const conn = await getConnection(userId);
  const from = conn.accountEmail
    ? (input.fromName ? `${encodeHeader(input.fromName)} <${conn.accountEmail}>` : conn.accountEmail)
    : undefined;

  // Build a minimal RFC 822 message. The HTML body is included as raw UTF-8 in
  // the message; only the WHOLE message is base64url-encoded for the API.
  // (Previously the body was ALSO base64-encoded inside the MIME part, which
  // Gmail didn't decode → recipients saw an empty body.)
  const lines = [
    from ? `From: ${from}` : "",
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    input.body,
  ].filter(Boolean);
  const raw = b64url(lines.join("\r\n"));

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` };
  const data = (await res.json()) as { threadId?: string };
  return { ok: true, threadId: data.threadId };
}
