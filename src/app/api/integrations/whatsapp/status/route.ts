import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { whatsappDiagnostics } from "@/lib/whatsapp";
import { appOrigin } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only WhatsApp diagnostics (never exposes token values).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });
  return NextResponse.json({ mode: "cloud-api", ...whatsappDiagnostics(appOrigin()) });
}
