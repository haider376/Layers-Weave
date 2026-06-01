import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessSales } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { fetchZoomRecording } from "@/lib/zoom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Streams a Zoom call recording to the browser. Zoom's download_url is an
// authenticated API endpoint (it 401s with "Access token is required" when
// opened directly), so we fetch it with the account bearer token server-side
// and pipe the audio back. Linked from the contact timeline & coaching page as
//   /api/integrations/zoom/recording?call=<callLogId>
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  if (!canAccessSales(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const callId = req.nextUrl.searchParams.get("call");
  if (!callId) return NextResponse.json({ error: "missing call id" }, { status: 400 });

  const call = await prisma.callLog.findUnique({ where: { id: callId }, select: { recordingUrl: true } }).catch(() => null);
  if (!call?.recordingUrl) return NextResponse.json({ error: "no recording for this call" }, { status: 404 });

  const result = await fetchZoomRecording(call.recordingUrl);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const upstream = result.res;
  const headers = new Headers();
  headers.set("content-type", upstream.headers.get("content-type") ?? "audio/mpeg");
  const len = upstream.headers.get("content-length");
  if (len) headers.set("content-length", len);
  // Inline so the browser opens an audio player rather than downloading.
  headers.set("content-disposition", "inline");
  headers.set("cache-control", "private, max-age=300");

  return new NextResponse(upstream.body, { status: 200, headers });
}
