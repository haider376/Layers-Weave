import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { zoomConfigured, zoomGetConnection } from "@/lib/zoom";
import { appOrigin } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only Zoom diagnostics (never exposes secrets).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });

  // Account-level (Server-to-Server): connection = can we mint a token?
  const conn = await zoomGetConnection().catch(() => ({ connected: false, accountEmail: null }));
  return NextResponse.json({
    mode: "server-to-server",
    configured: zoomConfigured(),
    has_ZOOM_ACCOUNT_ID: !!process.env.ZOOM_ACCOUNT_ID,
    has_ZOOM_CLIENT_ID: !!process.env.ZOOM_CLIENT_ID,
    has_ZOOM_CLIENT_SECRET: !!process.env.ZOOM_CLIENT_SECRET,
    has_ZOOM_WEBHOOK_SECRET: !!process.env.ZOOM_WEBHOOK_SECRET,
    tokenMintable: conn.connected,
    webhookUrl: `${appOrigin()}/api/integrations/zoom/webhook`,
  });
}
