// Abstract graffiti-wall backdrop generator — original composition of spray
// sweeps, throw-up bubbles, drips, scribbles, arrows and splatter in the brand
// palette. Hand-painted rough edges via turbulence displacement. Deterministic
// (seeded PRNG) so re-runs are identical. Writes public/brand/graffiti-wall.svg.
const fs = require("fs");
const path = require("path");

const W = 1600, H = 1000;
// Lime-only palette (two lime tones for depth).
const LIME = "#6FE01A", LIME2 = "#A9DF1E";
const COLORS = [LIME, LIME2, LIME, LIME2];

// mulberry32 seeded PRNG
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(20260702);
const rand = (a, b) => a + r() * (b - a);
const pick = (arr) => arr[Math.floor(r() * arr.length)];
const c = (n) => Math.round(n);

const parts = [];

// A tapering paint drip that ends in a blob.
function drip(x, y, len, w) {
  const rr = w * 0.85, endY = y + len;
  return `<path d="M${c(x - w / 2)},${c(y)} C${c(x - w / 2)},${c(y + len * 0.6)} ${c(x - rr)},${c(endY - rr)} ${c(x)},${c(endY)} C${c(x + rr)},${c(endY - rr)} ${c(x + w / 2)},${c(y + len * 0.6)} ${c(x + w / 2)},${c(y)} Z"/><circle cx="${c(x)}" cy="${c(endY)}" r="${c(rr)}"/>`;
}

// 1) Big soft colour clouds (sprayed base washes)
for (let i = 0; i < 4; i++) {
  const col = pick(COLORS), x = rand(0, W), y = rand(0, H), rr = rand(180, 340);
  parts.push(`<circle cx="${c(x)}" cy="${c(y)}" r="${c(rr)}" fill="${col}" opacity="${(rand(6, 13) / 100).toFixed(2)}" filter="url(#soft)"/>`);
}

// 2) Sweeping spray strokes (thick wobbly beziers) with drips
for (let i = 0; i < 6; i++) {
  const col = pick(COLORS), sw = rand(10, 34);
  const x1 = rand(-100, W), y1 = rand(0, H);
  const x2 = x1 + rand(-380, 380), y2 = y1 + rand(-160, 160);
  const cx = (x1 + x2) / 2 + rand(-160, 160), cy = (y1 + y2) / 2 + rand(-160, 160);
  const op = (rand(30, 70) / 100).toFixed(2);
  parts.push(`<g filter="url(#rough)" opacity="${op}"><path d="M${c(x1)},${c(y1)} Q${c(cx)},${c(cy)} ${c(x2)},${c(y2)}" fill="none" stroke="${col}" stroke-width="${c(sw)}" stroke-linecap="round"/>`);
  // occasional drips off the stroke
  if (r() < 0.6) { const dx = rand(Math.min(x1, x2), Math.max(x1, x2)); parts.push(`<g fill="${col}">${drip(dx, Math.max(y1, y2), rand(30, 120), rand(6, 12))}</g>`); }
  parts.push(`</g>`);
}

// 3) Throw-up bubbles (rounded blob outlines)
for (let i = 0; i < 3; i++) {
  const col = pick(COLORS), x = rand(120, W - 120), y = rand(120, H - 120);
  const w = rand(90, 220), h = rand(70, 150), sw = rand(8, 18);
  parts.push(`<g filter="url(#rough)" opacity="${(rand(35, 65) / 100).toFixed(2)}"><path d="M${c(x - w)},${c(y)} q0,${c(-h)} ${c(w)},${c(-h)} q${c(w)},0 ${c(w)},${c(h)} q0,${c(h)} ${c(-w)},${c(h)} q${c(-w)},0 ${c(-w)},${c(-h)} Z" fill="none" stroke="${col}" stroke-width="${c(sw)}" stroke-linejoin="round"/></g>`);
}

// 4) Scribble scrawls (dense zigzag tags — abstract, no letters)
for (let i = 0; i < 5; i++) {
  const col = pick(COLORS), x = rand(0, W - 260), y = rand(0, H), sw = rand(4, 11);
  let d = `M${c(x)},${c(y)}`;
  const n = Math.floor(rand(5, 11)); let px = x, py = y;
  for (let k = 0; k < n; k++) { px += rand(20, 60) * (r() < 0.5 ? 1 : 0.6); py += rand(-70, 70); d += ` L${c(px)},${c(py)}`; }
  parts.push(`<path d="${d}" fill="none" stroke="${col}" stroke-width="${c(sw)}" stroke-linecap="round" stroke-linejoin="round" opacity="${(rand(30, 60) / 100).toFixed(2)}" filter="url(#rough)"/>`);
}

// 5) Graffiti arrows
for (let i = 0; i < 3; i++) {
  const col = pick(COLORS), x = rand(0, W - 200), y = rand(40, H - 40), len = rand(90, 220), sw = rand(6, 14);
  const ang = rand(-0.5, 0.5), ex = x + len * Math.cos(ang), ey = y + len * Math.sin(ang);
  const head = 26;
  parts.push(`<g filter="url(#rough)" opacity="${(rand(40, 75) / 100).toFixed(2)}" stroke="${col}" stroke-width="${c(sw)}" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M${c(x)},${c(y)} L${c(ex)},${c(ey)}"/><path d="M${c(ex - head)},${c(ey - head)} L${c(ex)},${c(ey)} L${c(ex - head)},${c(ey + head)}"/></g>`);
}

// 6) Splatter dots + stars
for (let i = 0; i < 34; i++) {
  const col = pick(COLORS), x = rand(0, W), y = rand(0, H), rr = rand(2, 9);
  parts.push(`<circle cx="${c(x)}" cy="${c(y)}" r="${c(rr)}" fill="${col}" opacity="${(rand(20, 60) / 100).toFixed(2)}"/>`);
}
for (let i = 0; i < 4; i++) {
  const col = pick(COLORS), x = rand(0, W), y = rand(0, H), s = rand(10, 26);
  parts.push(`<g filter="url(#rough)" stroke="${col}" stroke-width="${c(rand(4, 8))}" stroke-linecap="round" opacity="${(rand(40, 80) / 100).toFixed(2)}"><path d="M${c(x - s)},${c(y)} L${c(x + s)},${c(y)} M${c(x)},${c(y - s)} L${c(x)},${c(y + s)} M${c(x - s * 0.7)},${c(y - s * 0.7)} L${c(x + s * 0.7)},${c(y + s * 0.7)} M${c(x - s * 0.7)},${c(y + s * 0.7)} L${c(x + s * 0.7)},${c(y - s * 0.7)}"/></g>`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" fill="none">
  <defs>
    <filter id="rough" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
  </defs>
  ${parts.join("\n  ")}
</svg>`;

const out = path.join(process.cwd(), "public/brand/graffiti-wall.svg");
fs.writeFileSync(out, svg);
console.log(`Wrote ${out} (${(svg.length / 1024).toFixed(1)} KB, ${parts.length} elements)`);
