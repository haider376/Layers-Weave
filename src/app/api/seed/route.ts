import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";
import { INIT_SQL } from "@/lib/initSql";

// One-shot setup for a fresh deployment. Visit:
//   /api/seed?key=YOUR_SEED_SECRET
// Creates the schema (idempotently) and loads demo data. Guarded by SEED_SECRET.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAlreadyExists(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  // 42P07 (table), 42710 (object), 42P06 (schema) all surface as "already exists"
  return msg.includes("already exists");
}

async function ensureSchema() {
  // Split the baseline DDL into individual statements and apply each one,
  // ignoring "already exists" so this is safe to run repeatedly.
  const statements = INIT_SQL.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  let created = 0;
  for (const stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      created++;
    } catch (e) {
      if (!isAlreadyExists(e)) throw e;
    }
  }
  return created;
}

export async function GET(req: NextRequest) {
  try {
    // Create the schema first (idempotent, DDL only — safe to run anytime).
    const statementsRun = await ensureSchema();

    // First-run convenience: if the database has no users yet, allow seeding
    // without a key. Once it has data, a re-seed requires ?key=SEED_SECRET so
    // nobody can wipe live data.
    const existing = await prisma.user.count();
    if (existing > 0) {
      const secret = process.env.SEED_SECRET;
      const key = req.nextUrl.searchParams.get("key");
      if (!secret || key !== secret) {
        return NextResponse.json(
          {
            error:
              "Database already seeded. To re-seed (this wipes data), set SEED_SECRET in Vercel and call /api/seed?key=YOUR_SEED_SECRET.",
            users: existing,
          },
          { status: 401 },
        );
      }
    }

    const result = await seedDatabase(prisma);
    return NextResponse.json({
      ok: true,
      schemaStatementsApplied: statementsRun,
      seeded: result,
      message: "Database ready. Sign in with haider@layerswholesale.co / password",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Seed failed" },
      { status: 500 },
    );
  }
}
