import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { exchangeCodeAndStore, appOrigin } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Google redirects back here with ?code=…&state=…
export async function GET(req: NextRequest) {
  const origin = appOrigin();
  const back = (status: string) => NextResponse.redirect(new URL(`/calendar?gcal=${status}`, origin));

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  if (err) return back("denied");
  if (!code || !state) return back("error");

  // Validate CSRF state.
  const store = await cookies();
  const saved = store.get("lw_gcal_state")?.value;
  store.delete("lw_gcal_state");
  if (!saved || saved !== state) return back("error");

  try {
    await exchangeCodeAndStore(code, user.id);
    return back("connected");
  } catch {
    return back("error");
  }
}
