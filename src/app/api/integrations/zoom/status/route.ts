import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { zoomConfigured, zoomTokenProbe } from "@/lib/zoom";
import { appOrigin } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only Zoom diagnostics (never exposes secret values, only lengths/errors).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });

  const acct = process.env.ZOOM_ACCOUNT_ID ?? "";
  const cid = process.env.ZOOM_CLIENT_ID ?? "";
  const sec = process.env.ZOOM_CLIENT_SECRET ?? "";

  // Live probe — returns Zoom's actual rejection reason if token mint fails.
  const probe = await zoomTokenProbe().catch((e) => ({ ok: false, error: String(e) }));

  return NextResponse.json({
    mode: "server-to-server",
    configured: zoomConfigured(),
    has_ZOOM_ACCOUNT_ID: !!acct,
    ZOOM_ACCOUNT_ID_length: acct.trim().length,
    ZOOM_ACCOUNT_ID_hasWhitespace: acct !== acct.trim(),
    has_ZOOM_CLIENT_ID: !!cid,
    ZOOM_CLIENT_ID_length: cid.trim().length,
    has_ZOOM_CLIENT_SECRET: !!sec,
    ZOOM_CLIENT_SECRET_length: sec.trim().length,
    has_ZOOM_WEBHOOK_SECRET: !!process.env.ZOOM_WEBHOOK_SECRET,
    tokenMintable: probe.ok,
    tokenError: probe.ok ? null : probe,   // ← Zoom's real error lives here
    webhookUrl: `${appOrigin()}/api/integrations/zoom/webhook`,
  });
}
