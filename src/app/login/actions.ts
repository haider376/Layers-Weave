"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, emailDomainAllowed } from "@/lib/auth";

export type LoginState = { error: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Enter your company email and password." };
  }
  // Auth restricted to the company domain(s) (spec §6 / acceptance criteria).
  if (!emailDomainAllowed(email)) {
    return { error: "Sign-in is restricted to @layerswholesale.co addresses." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { error: "No active account for that email." };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { error: "Incorrect password." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}
