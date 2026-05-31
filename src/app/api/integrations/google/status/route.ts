import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { googleConfigured, appOrigin, redirectUri, googleDiagnostics } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safe diagnostics — reports whether the server can SEE the Google env vars,
// WITHOUT ever returning their values. Admin-only.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });

  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;

  // Live diagnostics for THIS admin's connection (scopes + a real Calendar probe).
  const connection = await googleDiagnostics(user.id);

  return NextResponse.json({
    configured: googleConfigured(),
    has_GOOGLE_CLIENT_ID: !!id,
    GOOGLE_CLIENT_ID_length: id ? id.trim().length : 0,
    GOOGLE_CLIENT_ID_endsWith: id ? id.trim().slice(-30) : null, // client id is public, safe to show tail
    has_GOOGLE_CLIENT_SECRET: !!secret,
    GOOGLE_CLIENT_SECRET_length: secret ? secret.trim().length : 0,
    has_APP_URL: !!process.env.APP_URL,
    APP_URL: process.env.APP_URL ?? null,
    VERCEL_URL: process.env.VERCEL_URL ?? null,
    computed_appOrigin: appOrigin(),
    computed_redirectUri: redirectUri(),
    NODE_ENV: process.env.NODE_ENV,
    connection,
  });
}
