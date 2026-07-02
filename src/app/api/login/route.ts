import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, emailDomainAllowed } from "@/lib/auth";
import { ensureCadenceSchema } from "@/lib/ensureCadenceSchema";

// Heal-and-retry: on a lagging deploy the User table may be missing newer
// columns (managedPassword/phone), which would make this first query throw.
async function findByEmail(email: string) {
  try { return await prisma.user.findUnique({ where: { email } }); }
  catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
    if (msg.includes("column") || msg.includes("managedpassword") || msg.includes("phone") || (e as { code?: string }).code === "42703") {
      await ensureCadenceSchema().catch(() => {});
      return await prisma.user.findUnique({ where: { email } });
    }
    throw e;
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let email = "";
  let password = "";
  try {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json();
      email = String(body.email || "");
      password = String(body.password || "");
    } else {
      const form = await req.formData();
      email = String(form.get("email") || "");
      password = String(form.get("password") || "");
    }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  email = email.trim().toLowerCase();

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your company email and password." }, { status: 400 });
  }
  if (!emailDomainAllowed(email)) {
    return NextResponse.json({ error: "Sign-in is restricted to your company email domain." }, { status: 403 });
  }

  const user = await findByEmail(email);
  if (!user || !user.active) {
    return NextResponse.json(
      { error: "No account for that email. (Has the database been seeded?)" },
      { status: 401 },
    );
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
