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

// Pull "ALTER TABLE X ADD COLUMN IF NOT EXISTS <coldef>" out of each CREATE TABLE
// so existing databases get newly-added columns too (non-destructive upgrade).
function columnPatches(createStmt: string): string[] {
  const m = createStmt.match(/CREATE TABLE\s+"([^"]+)"\s*\(([\s\S]*)\)\s*$/i);
  if (!m) return [];
  const table = m[1];
  const body = m[2];
  const parts: string[] = [];
  let depth = 0, cur = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts
    .map((s) => s.trim())
    .filter((s) => s.startsWith('"') && !/^"?CONSTRAINT/i.test(s) && !/PRIMARY KEY/i.test(s))
    .map((col) => `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS ${col}`);
}

async function ensureSchema() {
  const statements = INIT_SQL.split(";")
    // strip leading `-- comment` lines so statements start with the real SQL keyword
    .map((s) => s.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").trim())
    .filter(Boolean);
  const creates = statements.filter((s) => /^CREATE TABLE/i.test(s));
  const rest = statements.filter((s) => !/^CREATE TABLE/i.test(s));
  let applied = 0;

  // 1) Create any missing tables.
  for (const stmt of creates) {
    try { await prisma.$executeRawUnsafe(stmt); applied++; }
    catch (e) { if (!isAlreadyExists(e)) throw e; }
  }
  // 2) Add any missing columns to tables that already existed (schema upgrade).
  for (const stmt of creates) {
    for (const patch of columnPatches(stmt)) {
      try { await prisma.$executeRawUnsafe(patch); applied++; } catch { /* best-effort */ }
    }
  }
  // 3) Schema, indexes, foreign keys (skip ones that already exist).
  for (const stmt of rest) {
    try { await prisma.$executeRawUnsafe(stmt); applied++; }
    catch (e) { if (!isAlreadyExists(e)) throw e; }
  }
  return applied;
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
