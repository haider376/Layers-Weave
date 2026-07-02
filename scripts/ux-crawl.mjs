import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://127.0.0.1:3100";
const OUT = process.env.OUT_DIR || "/tmp/ux";
fs.mkdirSync(OUT, { recursive: true });

// Roles to crawl as (email → representative access level). "500 users" in
// spirit = every role hitting every page, capturing console errors, failed
// requests, layout overflow, dead links, and slow renders.
const USERS = [
  { email: "oliver@layerswholesale.co", role: "CEO" },
  { email: "haider@layerswholesale.co", role: "CRO" },
  { email: "zikriya@layerswholesale.co", role: "Sales Manager" },
  { email: "asjad@layerswholesale.co", role: "AE" },
  { email: "fatima@layerswholesale.co", role: "BDR" },
  { email: "shahzaib@layerswholesale.co", role: "Lead Gen/CRM" },
];

const ROUTES = [
  "/dashboard", "/reports", "/revenue", "/forecast", "/sales", "/companies",
  "/contacts", "/cadences", "/tasks", "/calendar", "/inbox", "/activity",
  "/calls", "/leaderboard", "/goals", "/settings", "/search",
];

const THEMES = ["dark", "light"];
const findings = [];
const add = (f) => findings.push(f);

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password");
  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(500);
  return page.url().includes("/dashboard") || !page.url().includes("/login");
}

async function run() {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
  let pass = 0;

  for (const theme of THEMES) {
    for (const user of USERS) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();

      const consoleErrors = [];
      const failedReqs = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 240)); });
      page.on("pageerror", (e) => consoleErrors.push("PAGEERROR: " + String(e).slice(0, 240)));
      page.on("requestfailed", (r) => failedReqs.push(`${r.method()} ${r.url().replace(BASE, "")} — ${r.failure()?.errorText}`));
      page.on("response", (r) => { const s = r.status(); if (s >= 500) failedReqs.push(`${s} ${r.url().replace(BASE, "")}`); });

      const ok = await login(page, user.email);
      if (!ok) { add({ type: "LOGIN_FAIL", user: user.email }); await ctx.close(); continue; }

      // set theme
      await page.evaluate((t) => {
        const p = JSON.parse(localStorage.getItem("lw-prefs") || "{}"); p.theme = t;
        localStorage.setItem("lw-prefs", JSON.stringify(p));
      }, theme);

      for (const route of ROUTES) {
        consoleErrors.length = 0; failedReqs.length = 0;
        const t0 = Date.now();
        let status = 0;
        try {
          const resp = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 20000 });
          status = resp?.status() ?? 0;
        } catch (e) {
          add({ type: "NAV_ERROR", theme, role: user.role, route, detail: String(e).slice(0, 160) });
          continue;
        }
        const loadMs = Date.now() - t0;
        await page.waitForTimeout(350);

        // Redirected away? (access control / dead route)
        const landed = new URL(page.url()).pathname;
        if (landed !== route && !(route === "/dashboard" && landed === "/dashboard")) {
          add({ type: "REDIRECT", theme, role: user.role, route, to: landed });
        }

        // Horizontal overflow (layout break)
        const overflow = await page.evaluate(() => {
          const de = document.documentElement;
          return de.scrollWidth - de.clientWidth;
        });
        if (overflow > 4) add({ type: "H_OVERFLOW", theme, role: user.role, route, px: overflow });

        // Very low contrast text on this theme (sample muted/faint tokens vs bg)
        const contrast = await page.evaluate(() => {
          function lum(c) { const m = c.match(/\d+/g); if (!m) return 0; const [r, g, b] = m.map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
          const bg = getComputedStyle(document.body).backgroundColor;
          const bl = lum(bg);
          let worst = 21;
          for (const el of Array.from(document.querySelectorAll("body *")).slice(0, 400)) {
            const s = getComputedStyle(el);
            if (!el.textContent?.trim() || el.children.length) continue;
            const fl = lum(s.color);
            const ratio = (Math.max(fl, bl) + 0.05) / (Math.min(fl, bl) + 0.05);
            if (ratio < worst) worst = ratio;
          }
          return Math.round(worst * 100) / 100;
        });
        if (contrast < 2.2) add({ type: "LOW_CONTRAST", theme, role: user.role, route, ratio: contrast });

        // Empty-state / "no data" presence (informational)
        const emptyCount = await page.locator(".q-note, .empty-st").count();

        if (status >= 400) add({ type: "HTTP_" + status, theme, role: user.role, route });
        if (loadMs > 4000) add({ type: "SLOW", theme, role: user.role, route, ms: loadMs });
        if (consoleErrors.length) add({ type: "CONSOLE", theme, role: user.role, route, errors: [...new Set(consoleErrors)].slice(0, 4) });
        if (failedReqs.length) add({ type: "REQ_FAIL", theme, role: user.role, route, reqs: [...new Set(failedReqs)].slice(0, 4) });

        // Screenshot the CEO dark + light for review of a few key pages
        if (user.role === "CEO" && ["/dashboard", "/reports", "/sales", "/companies", "/leaderboard", "/settings"].includes(route)) {
          await page.screenshot({ path: `${OUT}/${theme}-${route.slice(1)}.png` }).catch(() => {});
        }
        pass++;
      }
      await ctx.close();
    }
  }

  await browser.close();
  fs.writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));

  // Aggregate summary
  const byType = {};
  for (const f of findings) byType[f.type] = (byType[f.type] || 0) + 1;
  console.log(`\n=== UX CRAWL: ${pass} page-loads across ${USERS.length} roles × ${THEMES.length} themes ===`);
  console.log("Findings by type:", JSON.stringify(byType, null, 2));
  // Print unique interesting findings compactly
  const interesting = findings.filter((f) => !["REDIRECT"].includes(f.type));
  const seen = new Set();
  for (const f of interesting) {
    const k = `${f.type}|${f.route}|${f.theme}|${JSON.stringify(f.errors || f.reqs || f.px || f.ratio || f.ms || "")}`;
    if (seen.has(k)) continue; seen.add(k);
    console.log(JSON.stringify(f));
  }
  // Redirect summary (access control map)
  const redirects = findings.filter((f) => f.type === "REDIRECT");
  const rmap = {};
  for (const r of redirects) { const k = `${r.role} ${r.route}->${r.to}`; rmap[k] = (rmap[k] || 0) + 1; }
  console.log("\n=== Access redirects (role gated) ===");
  console.log(Object.keys(rmap).join("\n") || "(none)");
}

run().catch((e) => { console.error("CRAWL FATAL:", e); process.exit(1); });
