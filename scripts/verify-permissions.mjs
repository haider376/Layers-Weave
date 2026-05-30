// Server-side permission checks (sales-only roster).
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const env = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
const SECRET = (env.match(/SESSION_SECRET="?([^"\n]+)"?/) || [])[1];
const prisma = new PrismaClient();

function cookie(userId) {
  const mac = crypto.createHmac("sha256", SECRET).update(userId).digest("hex");
  return `lw_session=${userId}.${mac}`;
}
async function fetchAs(path, userId) {
  const res = await fetch(`http://localhost:3000${path}`, { headers: { cookie: cookie(userId) }, redirect: "manual" });
  const body = res.status >= 300 && res.status < 400 ? "" : await res.text();
  return { status: res.status, location: res.headers.get("location"), body };
}

const users = Object.fromEntries((await prisma.user.findMany()).map((u) => [u.email.split("@")[0], u]));
const checks = [];
const check = (name, cond) => checks.push({ name, pass: !!cond });

// CRO (admin) sees margin on the calculator
{
  const r = await fetchAs("/calculator", users.haider.id);
  check("CRO can load /calculator", r.status === 200);
  check("CRO calculator shows 'Your margin'", r.body.includes("Your margin"));
}
// AE cannot read margin on the calculator
{
  const r = await fetchAs("/calculator", users.kamila.id);
  check("AE can load /calculator", r.status === 200);
  check("AE calculator hides 'Your margin'", !r.body.includes("Your margin"));
}
// AE blocked from the (hidden) supply module at the route level
{
  const r = await fetchAs("/supply", users.kamila.id);
  check("AE blocked from /supply (redirect)", r.status === 307);
}
// Core sales pages load for an AE
{
  for (const p of ["/dashboard", "/sales", "/companies", "/contacts", "/calendar", "/calls", "/leaderboard", "/reports", "/settings"]) {
    const r = await fetchAs(p, users.kamila.id);
    check(`AE can load ${p}`, r.status === 200);
  }
}
// Unauthenticated blocked
{
  const res = await fetch("http://localhost:3000/dashboard", { redirect: "manual" });
  check("Unauthenticated blocked from /dashboard", res.status === 307);
}

await prisma.$disconnect();
let failed = 0;
for (const c of checks) { console.log(`${c.pass ? "✅" : "❌"}  ${c.name}`); if (!c.pass) failed++; }
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
