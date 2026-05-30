import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./db";

const COOKIE = "lw_session";
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
  role: string;
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
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    title: user.title,
    avatarUrl: user.avatarUrl,
  };
}

/** Throws-free guard for server actions / route handlers. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
