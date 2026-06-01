import { NextRequest, NextResponse } from "next/server";
import { zoomVerifySignature, zoomUrlValidation, processZoomCallEvent } from "@/lib/zoom";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stash the last few webhook payloads so an admin can inspect the EXACT shape
// Zoom sends (recording URL fields vary by event/version). Best-effort.
async function capture(event: string, body: unknown) {
  try {
    await prisma.appSetting.upsert({
      where: { key: "zoom-last-webhook" },
      create: { key: "zoom-last-webhook", value: JSON.stringify({ at: new Date().toISOString(), event, body }).slice(0, 8000) },
      update: { value: JSON.stringify({ at: new Date().toISOString(), event, body }).slice(0, 8000) },
    });
  } catch { /* table may not exist yet — ignore */ }
}

// GET — reachability + readiness + a self-test of the validation math.
// Visiting the URL shows whether ZOOM_WEBHOOK_SECRET is set, its exact length
// (to catch stray spaces/quotes), and a sample encryptedToken so we can confirm
// the handshake works BEFORE clicking "Validate" in the Zoom Marketplace.
export async function GET() {
  const secret = process.env.ZOOM_WEBHOOK_SECRET ?? "";
  const sample = zoomUrlValidation("sampleToken123");
  return NextResponse.json({
    ok: true,
    endpoint: "zoom webhook",
    webhookSecretSet: !!secret,
    secretLength: secret.length,
    secretHasWhitespace: secret !== secret.trim(),
    sampleValidation: sample, // {plainToken, encryptedToken} — proves the HMAC runs
    hint: secret
      ? "Set this exact URL in Zoom, ensure the Secret Token matches, then Validate."
      : "Set ZOOM_WEBHOOK_SECRET in Vercel and redeploy BEFORE clicking Validate.",
  });
}

// Zoom Phone webhook receiver:
//  - answers the one-time URL-validation challenge
//  - verifies the signature on every event
//  - auto-logs completed calls into the CRM (matched by phone number)
export async function POST(req: NextRequest) {
  const raw = await req.text();
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  // 1) URL validation handshake (Zoom sends this when you save the endpoint).
  if (body.event === "endpoint.url_validation") {
    const plainToken = (body.payload as { plainToken?: string } | undefined)?.plainToken ?? "";
    return NextResponse.json(zoomUrlValidation(plainToken));
  }

  // 2) Verify signature on real events.
  const sig = req.headers.get("x-zm-signature");
  const ts = req.headers.get("x-zm-request-timestamp");
  if (!zoomVerifySignature(raw, sig, ts)) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }

  // Capture the raw event for inspection (admin debug endpoint reads this).
  await capture(String(body.event ?? "unknown"), body);

  // 3) Auto-log completed calls (extraction shared with the debug replay route).
  try { await processZoomCallEvent(body); }
  catch { /* never fail the webhook on a logging error */ }

  // Always 200 quickly so Zoom doesn't retry.
  return NextResponse.json({ ok: true });
}
