import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureCadenceSchema } from "@/lib/ensureCadenceSchema";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only: force the idempotent schema heal (adds any missing columns/tables
// like CallLog.recordingUrl/zoomCallId, Integration, Cadence*). Safe to re-run.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });

  await ensureCadenceSchema();

  // Report the resulting CallLog columns so we can confirm the heal worked.
  let columns: string[] = [];
  try {
    const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'CallLog' ORDER BY column_name`,
    );
    columns = rows.map((r) => r.column_name);
  } catch { /* ignore */ }

  return NextResponse.json({
    healed: true,
    callLogColumns: columns,
    hasRecordingUrl: columns.includes("recordingUrl"),
    hasZoomCallId: columns.includes("zoomCallId"),
  });
}
