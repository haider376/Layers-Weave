import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only: probes whether the CallLog table accepts an insert (and reports
// the exact DB error if not — e.g. a missing column on a stale prod schema).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "sign in" }, { status: 401 });
  if (!user.isAdmin) return NextResponse.json({ error: "admins only" }, { status: 403 });

  // Check which columns the live DB actually has.
  let columns: string[] = [];
  try {
    const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'CallLog' ORDER BY column_name`,
    );
    columns = rows.map((r) => r.column_name);
  } catch (e) {
    return NextResponse.json({ stage: "introspect", error: String(e) });
  }

  // Try a real insert against a known contact, then delete it.
  const contact = await prisma.contact.findFirst({ select: { id: true, companyId: true } }).catch(() => null);
  if (!contact) return NextResponse.json({ columns, insert: "skipped — no contact to attach to" });

  try {
    const c = await prisma.callLog.create({
      data: { contactId: contact.id, companyId: contact.companyId, number: "+10000000000", via: "Zoom Phone", connected: false, outcome: "debug", agent: user.name, durationSec: 1 },
    });
    await prisma.callLog.delete({ where: { id: c.id } });
    return NextResponse.json({ columns, insert: "ok" });
  } catch (e) {
    return NextResponse.json({
      columns,
      insert: "FAILED",
      code: (e as { code?: string })?.code,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
