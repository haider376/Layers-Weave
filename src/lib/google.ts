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

const PROVIDER = "google-calendar";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
];

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function appOrigin(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
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
