import { NextRequest, NextResponse } from "next/server";
import { whatsappVerifyChallenge, whatsappVerifySignature, processWhatsAppWebhook } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — Meta's one-time verification handshake when you save the webhook URL.
// Echoes hub.challenge back (as plain text) iff the verify token matches.
export async function GET(req: NextRequest) {
  const { ok, challenge } = whatsappVerifyChallenge(req.nextUrl.searchParams);
  if (ok) return new NextResponse(challenge ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  return NextResponse.json({ ok: false, error: "verification failed" }, { status: 403 });
}

// POST — inbound message + status events. Verify the signature, then log any
// inbound messages against their matching contact. Always 200 fast so Meta
// doesn't retry/disable the subscription.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!whatsappVerifySignature(raw, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  try { await processWhatsAppWebhook(body); } catch { /* never fail the webhook */ }
  return NextResponse.json({ ok: true });
}
