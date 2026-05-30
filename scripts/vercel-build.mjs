// Vercel build entry. Resolves a Postgres connection string from whichever env
// var the host provides, exposes it as DATABASE_URL for the Prisma CLI, then
// pushes the schema and builds. Keeps deploys working without the user having
// to hand-create a DATABASE_URL variable.
import { execSync } from "node:child_process";

const DIRECT_ORDER = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
];

const found = DIRECT_ORDER.map((k) => [k, process.env[k]]).find(([, v]) => v && String(v).trim());

if (!found) {
  console.error(
    "\n✗ No Postgres connection string found in the environment.\n" +
      "  Set DATABASE_URL (or connect a Vercel Postgres / Neon database) in\n" +
      "  Project → Settings → Environment Variables, then redeploy.\n" +
      `  Looked for: ${DIRECT_ORDER.join(", ")}\n`,
  );
  process.exit(1);
}

const [name, url] = found;
process.env.DATABASE_URL = String(url);
console.log(`✓ Using Postgres connection from ${name} for schema push.`);

execSync("prisma generate && prisma db push --accept-data-loss && next build", {
  stdio: "inherit",
  env: process.env,
});
