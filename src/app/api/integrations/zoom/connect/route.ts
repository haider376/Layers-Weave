import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { zoomAuthUrl, zoomConfigured } from "@/lib/zoom";
import { appOrigin } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", appOrigin()));
  if (!zoomConfigured()) return NextResponse.redirect(new URL("/calls?zoom=unconfigured", appOrigin()));

  const state = crypto.randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("lw_zoom_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 });
  return NextResponse.redirect(zoomAuthUrl(state));
}
