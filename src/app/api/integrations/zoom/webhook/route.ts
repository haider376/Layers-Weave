import { NextRequest, NextResponse } from "next/server";
import { zoomVerifySignature, zoomUrlValidation, logZoomCall } from "@/lib/zoom";
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

  // 3) Auto-log completed calls.
  if (body.event === "phone.call_log_completed" || body.event === "phone.recording_completed") {
    const obj = (body.payload as { object?: Record<string, unknown> } | undefined)?.object ?? {};
    const direction = String(obj.direction ?? "outbound");
    const callId = String(obj.id ?? obj.call_id ?? obj.call_log_id ?? obj.call_id_str ?? `${Date.now()}-${Math.random()}`);
    const duration = Number(obj.duration ?? obj.call_duration ?? 0) || undefined;

    // Recording URL — Zoom Phone uses several shapes across events/versions:
    //   • top-level recording_url / download_url / play_url / file_url
    //   • a recording_files[] array with download_url / play_url
    //   • a recordings[] array (newer phone events)
    const recArrays = [obj.recording_files, obj.recordings].filter(Array.isArray) as Record<string, unknown>[][];
    let recordingUrl =
      (obj.recording_url as string | undefined) ??
      (obj.download_url as string | undefined) ??
      (obj.play_url as string | undefined) ??
      (obj.file_url as string | undefined);
    for (const arr of recArrays) {
      for (const r of arr) {
        recordingUrl = recordingUrl ?? (r.download_url as string | undefined) ?? (r.play_url as string | undefined) ?? (r.file_url as string | undefined);
      }
    }

    // The "other party" number depends on direction; check several field shapes.
    const callee = (obj.callee as { phone_number?: string } | undefined)?.phone_number ?? (obj.callee_number as string | undefined);
    const caller = (obj.caller as { phone_number?: string } | undefined)?.phone_number ?? (obj.caller_number as string | undefined);
    const number = direction === "inbound" ? (caller ?? callee ?? "") : (callee ?? caller ?? "");
    const agentEmail = (obj.owner as { email?: string } | undefined)?.email ?? (obj.user_email as string | undefined) ?? (obj.email as string | undefined);

    if (number) {
      try { await logZoomCall({ zoomCallId: callId, number, direction, durationSec: duration, recordingUrl, agentEmail }); }
      catch { /* never fail the webhook on a logging error */ }
    }
  }

  // Always 200 quickly so Zoom doesn't retry.
  return NextResponse.json({ ok: true });
}
