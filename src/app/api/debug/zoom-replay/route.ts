import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processZoomCallEvent } from "@/lib/zoom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only: re-process the LAST Zoom webhook we stored (zoom-last-webhook)
// through the call-logging pipeline. Useful to backfill a recording that Zoom
// already delivered before a fix shipped — Zoom won't re-fire it on its own.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });

  const row = await prisma.appSetting.findUnique({ where: { key: "zoom-last-webhook" } }).catch(() => null);
  if (!row?.value) return NextResponse.json({ error: "no stored webhook to replay" });

  let stored: { body?: Record<string, unknown> };
  try { stored = JSON.parse(row.value); } catch { return NextResponse.json({ error: "stored webhook is not valid JSON" }); }
  const body = stored.body;
  if (!body) return NextResponse.json({ error: "stored webhook has no body" });

  try {
    const result = await processZoomCallEvent(body);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}
