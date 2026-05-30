import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./db";
import { isAdmin } from "./permissions";

const COOKIE = "lw_session";
const VIEWAS_COOKIE = "lw_viewas";
const SECRET = process.env.SESSION_SECRET || "dev-secret";
// The company's own domains are ALWAYS allowed, so a stale ALLOWED_EMAIL_DOMAIN
// env var can never lock the real team out. Extra domains can be added via the
// env var (comma-separated).
const ALWAYS_ALLOWED = ["layerswholesale.co", "layerswholesale.com"];
const ALLOWED_DOMAINS = Array.from(
  new Set([
    ...ALWAYS_ALLOWED,
    ...(process.env.ALLOWED_EMAIL_DOMAIN || "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  ]),
);

export function emailDomainAllowed(email: string): boolean {
  const at = email.trim().toLowerCase().split("@");
  return at.length === 2 && ALLOWED_DOMAINS.includes(at[1]);
}

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  return `${value}.${mac}`;
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(value).digest("hex");
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return value;
}

export async function createSession(userId: string) {
  const store = await cookies();
  store.set(COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  // `role` is the EFFECTIVE role (what the app renders as). For an admin using
  // "View as", this is the impersonated role; otherwise it equals realRole.
  role: string;
  realRole: string;
  isAdmin: boolean;
  viewingAs: string | null; // non-null only while an admin is previewing another role
  title: string;
  avatarUrl: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const userId = verify(raw);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) return null;

  const admin = isAdmin(user.role);
  // "View as" only works for admins and can only RESTRICT visibility, never
  // escalate it — so using the effective role for guards/data-stripping is safe.
  const viewAs = admin ? store.get(VIEWAS_COOKIE)?.value || null : null;
  const effectiveRole = viewAs && viewAs !== user.role ? viewAs : user.role;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: effectiveRole,
    realRole: user.role,
    isAdmin: admin,
    viewingAs: effectiveRole !== user.role ? effectiveRole : null,
    title: user.title,
    avatarUrl: user.avatarUrl,
  };
}

export async function setViewAs(role: string | null) {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  const userId = raw ? verify(raw) : null;
  if (!userId) throw new Error("UNAUTHENTICATED");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !isAdmin(user.role)) throw new Error("FORBIDDEN");
  if (!role || role === user.role) {
    store.delete(VIEWAS_COOKIE);
  } else {
    store.set(VIEWAS_COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/" });
  }
}

/** Throws-free guard for server actions / route handlers. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
