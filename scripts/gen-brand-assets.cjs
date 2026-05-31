// Punk / graffiti brand-asset generator — lime-green, hand-drawn marker style
// with paint drips on a transparent background. Writes SVGs to public/brand.
const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "public/brand");
fs.mkdirSync(OUT, { recursive: true });

const LIME = "#6FE01A"; // punk lime (matches the reference globe)

// Shared defs: a "rough" displacement filter that gives every stroke that
// wobbly hand-painted edge, plus a subtle spray-grain texture.
const defs = (id) => `
  <defs>
    <filter id="rough_${id}" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="3" seed="${id}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="grain_${id}">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${id}" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.2 1.05"/>
      <feComposite operator="in" in2="SourceGraphic"/>
    </filter>
  </defs>`;

// A paint drip: a tapering runnel that ends in a round blob.
function drip(x, y, len, w = 7) {
  const r = w * 0.85;
  const endY = y + len;
  return `<path d="M${x - w / 2},${y} C${x - w / 2},${y + len * 0.6} ${x - r},${endY - r} ${x},${endY} C${x + r},${endY - r} ${x + w / 2},${y + len * 0.6} ${x + w / 2},${y} Z" fill="${LIME}"/>
  <circle cx="${x}" cy="${endY}" r="${r}" fill="${LIME}"/>`;
}

function svg(id, body, drips = [], { size = 512, sw = 16 } = {}) {
  const dripEls = drips.map((d) => drip(d.x, d.y, d.len, d.w)).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none">
${defs(id)}
  <g filter="url(#rough_${id})" stroke="${LIME}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none">
${body}
  </g>
  <g filter="url(#rough_${id})">
${dripEls}
  </g>
</svg>`;
}

const assets = {};

// 1) GLOBE — recreate the reference (stand + meridian ring + continents)
assets.globe = svg(1, `
  <circle cx="248" cy="210" r="150"/>
  <path d="M300 70 C360 70 410 120 410 200 C410 300 320 360 248 360"/>
  <path d="M150 150 C200 170 180 210 230 215 C270 219 250 260 300 250"/>
  <path d="M160 280 C210 270 200 300 250 300 C300 300 290 330 330 320"/>
  <path d="M248 360 L248 430"/>
  <path d="M150 430 C150 470 346 470 346 430"/>
  <path d="M170 430 C170 410 326 410 326 430"/>
`, [{ x: 130, y: 330, len: 70, w: 7 }, { x: 380, y: 320, len: 90, w: 8 }, { x: 250, y: 455, len: 60, w: 6 }, { x: 95, y: 455, len: 40, w: 5 }]);

// 2) STAR / SPARKLE (4-point)
assets.star = svg(2, `
  <path d="M256 70 C270 180 320 230 430 256 C320 282 270 332 256 442 C242 332 192 282 82 256 C192 230 242 180 256 70 Z"/>
`, [{ x: 140, y: 350, len: 70, w: 7 }, { x: 380, y: 340, len: 55, w: 6 }], { sw: 14 });

// 3) SMILEY
assets.smiley = svg(3, `
  <circle cx="256" cy="240" r="170"/>
  <path d="M180 210 q8 -26 24 0"/>
  <path d="M308 210 q8 -26 24 0"/>
  <path d="M170 290 C210 360 302 360 342 290"/>
`, [{ x: 110, y: 360, len: 80, w: 7 }, { x: 410, y: 350, len: 70, w: 7 }, { x: 256, y: 415, len: 55, w: 6 }]);

// 4) LIGHTNING BOLT
assets.bolt = svg(4, `
  <path d="M300 60 L160 280 L250 280 L210 450 L370 230 L275 230 L300 60 Z"/>
`, [{ x: 175, y: 285, len: 70, w: 7 }, { x: 250, y: 450, len: 60, w: 6 }], { sw: 15 });

// 5) GROWTH ARROW (sales up-and-to-the-right)
assets.arrow = svg(5, `
  <path d="M70 380 L200 250 L290 330 L430 150"/>
  <path d="M350 150 L430 150 L430 230"/>
`, [{ x: 200, y: 255, len: 80, w: 7 }, { x: 110, y: 400, len: 60, w: 6 }, { x: 430, y: 235, len: 70, w: 7 }]);

// 6) FLAME / fire (hot streak)
assets.flame = svg(6, `
  <path d="M256 60 C200 150 150 190 150 290 C150 370 200 440 256 440 C312 440 362 370 362 290 C362 230 330 210 320 250 C312 180 300 120 256 60 Z"/>
  <path d="M256 300 C236 320 226 345 256 380 C286 345 276 320 256 300 Z"/>
`, [{ x: 175, y: 360, len: 70, w: 7 }, { x: 335, y: 350, len: 80, w: 8 }, { x: 256, y: 445, len: 50, w: 6 }]);

// 7) HEART
assets.heart = svg(7, `
  <path d="M256 410 C120 320 90 230 90 175 C90 120 135 90 180 90 C220 90 245 120 256 150 C267 120 292 90 332 90 C377 90 422 120 422 175 C422 230 392 320 256 410 Z"/>
`, [{ x: 150, y: 300, len: 70, w: 7 }, { x: 256, y: 410, len: 70, w: 8 }, { x: 360, y: 300, len: 60, w: 6 }]);

// 8) CROWN
assets.crown = svg(8, `
  <path d="M90 360 L120 160 L200 260 L256 130 L312 260 L392 160 L422 360 Z"/>
  <path d="M90 360 L422 360"/>
`, [{ x: 130, y: 365, len: 60, w: 6 }, { x: 256, y: 370, len: 75, w: 7 }, { x: 390, y: 365, len: 55, w: 6 }]);

// 9) TARGET / spray rings
assets.target = svg(9, `
  <circle cx="256" cy="246" r="170"/>
  <circle cx="256" cy="246" r="100"/>
  <circle cx="256" cy="246" r="34"/>
`, [{ x: 120, y: 360, len: 75, w: 7 }, { x: 392, y: 350, len: 65, w: 7 }, { x: 256, y: 430, len: 50, w: 6 }]);

// 10) HANGER (vintage clothing)
assets.hanger = svg(10, `
  <path d="M256 120 C220 120 210 165 240 180 C260 190 256 210 256 220"/>
  <circle cx="256" cy="112" r="6"/>
  <path d="M256 220 L90 350 L422 350 L256 220 Z"/>
`, [{ x: 120, y: 355, len: 70, w: 7 }, { x: 256, y: 355, len: 85, w: 7 }, { x: 390, y: 355, len: 60, w: 6 }]);

// 11) PHONE (cold-call dialer)
assets.phone = svg(11, `
  <path d="M170 90 C150 90 120 110 120 150 C120 300 220 400 370 400 C410 400 430 370 430 350 C430 335 420 325 400 315 L350 295 C335 290 322 295 312 308 L295 330 C250 310 210 270 190 225 L212 208 C225 198 230 185 225 170 L205 120 C197 100 187 90 170 90 Z"/>
`, [{ x: 150, y: 230, len: 70, w: 7 }, { x: 380, y: 400, len: 65, w: 7 }], { sw: 14 });

// 12) TROPHY (top closer)
assets.trophy = svg(12, `
  <path d="M170 90 L342 90 L334 230 C330 290 290 320 256 320 C222 320 182 290 178 230 Z"/>
  <path d="M170 120 C120 120 110 190 170 200"/>
  <path d="M342 120 C392 120 402 190 342 200"/>
  <path d="M256 320 L256 380"/>
  <path d="M196 410 C196 380 316 380 316 410 Z"/>
`, [{ x: 150, y: 200, len: 60, w: 6 }, { x: 256, y: 410, len: 70, w: 7 }, { x: 300, y: 405, len: 50, w: 6 }]);

// Write all SVGs
for (const [name, content] of Object.entries(assets)) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), content.trim() + "\n");
}
console.log(`Wrote ${Object.keys(assets).length} SVGs to public/brand:`);
console.log(Object.keys(assets).join(", "));
