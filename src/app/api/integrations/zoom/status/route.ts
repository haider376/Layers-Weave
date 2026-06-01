import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { zoomConfigured, zoomRedirectUri, zoomGetConnection } from "@/lib/zoom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only Zoom diagnostics (never exposes secrets).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });

  const conn = await zoomGetConnection(user.id).catch(() => ({ connected: false, accountEmail: null }));
  return NextResponse.json({
    configured: zoomConfigured(),
    has_ZOOM_CLIENT_ID: !!process.env.ZOOM_CLIENT_ID,
    has_ZOOM_CLIENT_SECRET: !!process.env.ZOOM_CLIENT_SECRET,
    ZOOM_CLIENT_SECRET_length: process.env.ZOOM_CLIENT_SECRET ? process.env.ZOOM_CLIENT_SECRET.trim().length : 0,
    has_ZOOM_WEBHOOK_SECRET: !!process.env.ZOOM_WEBHOOK_SECRET,
    computed_redirectUri: zoomRedirectUri(),
    webhookUrl: zoomRedirectUri().replace("/callback", "/webhook"),
    connection: conn,
  });
}
