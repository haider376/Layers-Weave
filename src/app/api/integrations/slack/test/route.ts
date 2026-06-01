import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { postSlack, slackConfigured } from "@/lib/slack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only: posts a test message to the configured Slack channel so you can
// confirm the webhook works end-to-end before relying on real deal-won alerts.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });
  if (!slackConfigured()) return NextResponse.json({ ok: false, error: "SLACK_WEBHOOK_URL not configured" });

  const r = await postSlack({
    text: "✅ Layers Weave is connected to Slack — deal-won alerts will post here.",
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: ":white_check_mark: *Layers Weave is connected.*\nDeal-won alerts will land in this channel." } },
      { type: "context", elements: [{ type: "mrkdwn", text: `Test triggered by ${user.name}` }] },
    ],
  });
  return NextResponse.json(r);
}
