import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

// One-shot seeding for a fresh deployment. Visit:
//   /api/seed?key=YOUR_SEED_SECRET
// Guarded by the SEED_SECRET env var so it can't be triggered by anyone.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SEED_SECRET not configured" }, { status: 500 });
  }
  const key = req.nextUrl.searchParams.get("key");
  if (key !== secret) {
    return NextResponse.json({ error: "Invalid key" }, { status: 401 });
  }
  try {
    const result = await seedDatabase(prisma);
    return NextResponse.json({
      ok: true,
      seeded: result,
      message: 'Demo data loaded. Sign in with haider@layerswholesale.com / password',
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Seed failed" }, { status: 500 });
  }
}
