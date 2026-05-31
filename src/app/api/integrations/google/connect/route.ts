import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { authUrl, googleConfigured } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kick off the Google OAuth consent flow.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", process.env.APP_URL || "http://localhost:3000"));
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/calendar?gcal=unconfigured", process.env.APP_URL || "http://localhost:3000"));
  }

  // CSRF state: random token stored in an httpOnly cookie, echoed back by Google.
  const state = crypto.randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("lw_gcal_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });

  return NextResponse.redirect(authUrl(state));
}
