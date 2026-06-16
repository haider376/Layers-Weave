import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncRoster } from "@/lib/roster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only, NON-destructive roster sync — applies team changes to the live DB
// without re-seeding. Also runs automatically on first admin Settings load.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });
  const result = await syncRoster();
  return NextResponse.json({ ok: true, ...result, note: "New members sign in with the default password 'password' and can change it in Settings." });
}
