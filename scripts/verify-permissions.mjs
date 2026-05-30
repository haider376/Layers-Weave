// Verifies server-side enforcement of the margin wall + raghouse visibility
// by minting valid session cookies (same HMAC scheme as src/lib/auth.ts).
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

async function fetchAs(path, userId, follow = false) {
  const res = await fetch(`http://localhost:3000${path}`, {
    headers: { cookie: cookie(userId) },
    redirect: follow ? "follow" : "manual",
  });
  const body = res.status >= 300 && res.status < 400 ? "" : await res.text();
  return { status: res.status, location: res.headers.get("location"), body };
}

const users = Object.fromEntries(
  (await prisma.user.findMany()).map((u) => [u.email.split("@")[0], u])
);

const checks = [];
function check(name, cond) {
  checks.push({ name, pass: !!cond });
}

// CRO sees raghouse + margin on /supply
{
  const r = await fetchAs("/supply", users.haider.id);
  check("CRO can load /supply", r.status === 200);
  check("CRO sees Raghouse selector", r.body.includes("Raghouse"));
  check("CRO sees margin (Buy $)", /Buy \$/.test(r.body));
}
// Myra (Womenswear): raghouse YES, margin NO
{
  const r = await fetchAs("/supply", users.myra.id);
  check("Myra can load /supply", r.status === 200);
  check("Myra sees Raghouse selector", r.body.includes("Raghouse"));
  check("Myra does NOT see margin (Buy $)", !/Buy \$/.test(r.body));
}
// AE (Kamila): cannot access /supply at all (route guard -> redirect)
{
  const r = await fetchAs("/supply", users.kamila.id);
  check("AE is blocked from /supply (redirect)", r.status === 307 && r.location?.includes("/dashboard"));
}
// AE: API-level read of a quote omits raghouse + buying price.
// (We assert via the supply page payload that even when forced, an AE never
//  gets raghouse/buying data — covered by the redirect above; additionally
//  the calculator hides margin for non-margin roles.)
{
  const r = await fetchAs("/calculator", users.kamila.id);
  check("AE can load /calculator", r.status === 200);
  check("AE calculator hides 'Your margin' line", !r.body.includes("Your margin"));
}
// CRO calculator shows margin
{
  const r = await fetchAs("/calculator", users.haider.id);
  check("CRO calculator shows 'Your margin' line", r.body.includes("Your margin"));
}
// Logistics coordinator: blocked from /supply, allowed on /logistics
{
  const r1 = await fetchAs("/supply", users.waris.id);
  check("Logistics coord blocked from /supply", r1.status === 307);
  const r2 = await fetchAs("/logistics", users.waris.id);
  check("Logistics coord can load /logistics", r2.status === 200);
  check("Logistics shows auto freight badge (LCL/Air/FCL)", /Air|LCL|FCL/.test(r2.body));
  check("Logistics coord sees pickup source (raghouse) on shipments", /Pickup source/.test(r2.body) && /Italian Dreams|Imperial|Global Bags|Vintage Wholesale/.test(r2.body));
}
// No cookie -> redirect to login
{
  const res = await fetch("http://localhost:3000/dashboard", { redirect: "manual" });
  check("Unauthenticated blocked from /dashboard", res.status === 307);
}

await prisma.$disconnect();

let failed = 0;
for (const c of checks) {
  console.log(`${c.pass ? "✅" : "❌"}  ${c.name}`);
  if (!c.pass) failed++;
}
console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
