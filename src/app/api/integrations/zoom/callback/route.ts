import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { zoomExchangeAndStore } from "@/lib/zoom";
import { appOrigin } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = appOrigin();
  const back = (status: string) => NextResponse.redirect(new URL(`/calls?zoom=${status}`, origin));

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (url.searchParams.get("error")) return back("denied");
  if (!code || !state) return back("error");

  const store = await cookies();
  const saved = store.get("lw_zoom_state")?.value;
  store.delete("lw_zoom_state");
  if (!saved || saved !== state) return back("error");

  try {
    await zoomExchangeAndStore(code, user.id);
    return back("connected");
  } catch {
    return back("error");
  }
}
