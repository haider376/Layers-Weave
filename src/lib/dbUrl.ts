// Resolve a Postgres connection string from whichever env var the host provides.
// Different providers expose it under different names:
//   - Plain / docker / manual:        DATABASE_URL
//   - Vercel Postgres / Neon (pooled): POSTGRES_PRISMA_URL, POSTGRES_URL
//   - Neon (direct/unpooled):          DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING
//
// Runtime (serverless functions) prefers the POOLED url; schema-changing CLI
// commands (prisma db push) prefer a DIRECT url — see scripts/vercel-build.mjs.

const POOLED_ORDER = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
];

const DIRECT_ORDER = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
];

function firstSet(keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

export function resolveDatabaseUrl(): string | undefined {
  return firstSet(POOLED_ORDER);
}

export function resolveDirectDatabaseUrl(): string | undefined {
  return firstSet(DIRECT_ORDER);
}
