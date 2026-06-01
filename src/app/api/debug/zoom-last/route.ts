import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only: shows the most recent Zoom webhook payload we received, so we can
// see the EXACT shape (esp. where the recording URL lives) and the last few
// logged calls. Lets us confirm Zoom is actually firing events to us.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });

  const row = await prisma.appSetting.findUnique({ where: { key: "zoom-last-webhook" } }).catch(() => null);
  const recentCalls = await prisma.callLog
    .findMany({ where: { via: "Zoom Phone" }, orderBy: { createdAt: "desc" }, take: 5, select: { number: true, outcome: true, durationSec: true, recordingUrl: true, zoomCallId: true, createdAt: true } })
    .catch(() => []);

  return NextResponse.json({
    lastWebhook: row?.value ? JSON.parse(row.value) : "none received yet",
    recentZoomCalls: recentCalls,
  });
}
