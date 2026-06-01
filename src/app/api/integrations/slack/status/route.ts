import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { slackDiagnostics } from "@/lib/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only Slack diagnostics (never exposes the webhook URL itself).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });
  return NextResponse.json({ mode: "incoming-webhook", ...slackDiagnostics() });
}
