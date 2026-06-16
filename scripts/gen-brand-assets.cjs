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

// ── Expansion pack — more brand marks ──────────────────────────────────────

// 13) DOLLAR
assets.dollar = svg(13, `
  <path d="M256 70 L256 442"/>
  <path d="M340 140 C320 110 285 100 256 100 C200 100 165 130 165 175 C165 260 350 230 350 320 C350 370 305 400 256 400 C220 400 180 388 160 355"/>
`, [{ x: 256, y: 445, len: 55, w: 6 }, { x: 175, y: 360, len: 60, w: 6 }], { sw: 15 });

// 14) FIST (raised — rebellion / hype)
assets.fist = svg(14, `
  <path d="M160 250 L160 180 C160 162 188 162 188 180 L188 240 M188 240 L188 150 C188 132 216 132 216 150 L216 240 M216 240 L216 140 C216 122 244 122 244 140 L244 240 M244 240 L244 160 C244 142 272 142 272 160 L272 250"/>
  <path d="M160 250 C140 240 120 250 120 280 L120 330 C120 390 170 440 240 440 C320 440 360 390 360 320 L360 230 C360 212 332 212 332 230 L332 270"/>
`, [{ x: 150, y: 400, len: 60, w: 6 }, { x: 320, y: 400, len: 70, w: 7 }], { sw: 13 });

// 15) EYE
assets.eye = svg(15, `
  <path d="M60 256 C140 150 372 150 452 256 C372 362 140 362 60 256 Z"/>
  <circle cx="256" cy="256" r="60"/>
  <circle cx="256" cy="256" r="16" stroke="none" fill="${LIME}"/>
`, [{ x: 150, y: 320, len: 60, w: 6 }, { x: 360, y: 320, len: 70, w: 7 }]);

// 16) CLOCK (speed-to-lead)
assets.clock = svg(16, `
  <circle cx="256" cy="256" r="180"/>
  <path d="M256 150 L256 256 L330 300"/>
`, [{ x: 130, y: 370, len: 65, w: 7 }, { x: 380, y: 360, len: 55, w: 6 }, { x: 256, y: 440, len: 50, w: 6 }]);

// 17) SCISSORS (handpick / cut)
assets.scissors = svg(17, `
  <circle cx="150" cy="360" r="42"/>
  <circle cx="362" cy="360" r="42"/>
  <path d="M180 330 L400 110"/>
  <path d="M332 330 L112 110"/>
`, [{ x: 256, y: 240, len: 50, w: 5 }, { x: 150, y: 405, len: 50, w: 6 }], { sw: 14 });

// 18) ROCKET (launch / growth)
assets.rocket = svg(18, `
  <path d="M256 60 C320 110 350 190 350 270 L350 330 L162 330 L162 270 C162 190 192 110 256 60 Z"/>
  <circle cx="256" cy="210" r="34"/>
  <path d="M162 300 L110 360 L150 350 L150 410 L185 360"/>
  <path d="M350 300 L402 360 L362 350 L362 410 L327 360"/>
  <path d="M225 330 C225 380 256 430 256 430 C256 430 287 380 287 330"/>
`, [{ x: 200, y: 410, len: 55, w: 6 }, { x: 312, y: 410, len: 55, w: 6 }, { x: 256, y: 440, len: 45, w: 6 }]);

// 19) TAG (price / deal)
assets.tag = svg(19, `
  <path d="M250 90 L420 90 L420 260 L240 440 L70 270 L250 90 Z"/>
  <circle cx="360" cy="150" r="22"/>
`, [{ x: 130, y: 320, len: 60, w: 6 }, { x: 240, y: 440, len: 55, w: 6 }], { sw: 15 });

// 20) CHAT BUBBLE
assets.chat = svg(20, `
  <path d="M90 130 L422 130 L422 330 L230 330 L150 400 L150 330 L90 330 Z"/>
  <circle cx="180" cy="230" r="9" stroke="none" fill="${LIME}"/>
  <circle cx="256" cy="230" r="9" stroke="none" fill="${LIME}"/>
  <circle cx="332" cy="230" r="9" stroke="none" fill="${LIME}"/>
`, [{ x: 130, y: 335, len: 60, w: 6 }, { x: 360, y: 335, len: 70, w: 7 }]);

// 21) PIN (location / territory)
assets.pin = svg(21, `
  <path d="M256 70 C180 70 130 125 130 200 C130 300 256 440 256 440 C256 440 382 300 382 200 C382 125 332 70 256 70 Z"/>
  <circle cx="256" cy="195" r="50"/>
`, [{ x: 200, y: 380, len: 55, w: 6 }, { x: 256, y: 440, len: 50, w: 7 }]);

// 22) DIAMOND (premium tier)
assets.diamond = svg(22, `
  <path d="M150 90 L362 90 L440 200 L256 440 L72 200 Z"/>
  <path d="M72 200 L440 200"/>
  <path d="M150 90 L210 200 L256 440 L302 200 L362 90"/>
`, [{ x: 130, y: 250, len: 55, w: 6 }, { x: 380, y: 250, len: 60, w: 6 }]);

// 23) SKULL (punk staple)
assets.skull = svg(23, `
  <path d="M256 80 C160 80 100 150 100 240 C100 300 130 330 150 350 L150 400 L362 400 L362 350 C382 330 412 300 412 240 C412 150 352 80 256 80 Z"/>
  <circle cx="195" cy="245" r="34" stroke="none" fill="${LIME}"/>
  <circle cx="317" cy="245" r="34" stroke="none" fill="${LIME}"/>
  <path d="M256 300 L240 345 M256 300 L272 345"/>
  <path d="M210 400 L210 430 M256 400 L256 430 M302 400 L302 430"/>
`, [{ x: 150, y: 410, len: 55, w: 6 }, { x: 362, y: 410, len: 55, w: 6 }]);

// 24) HEADSET (BDR / support)
assets.headset = svg(24, `
  <path d="M120 280 L120 230 C120 130 200 80 256 80 C312 80 392 130 392 230 L392 280"/>
  <path d="M90 290 C90 270 140 270 140 290 L140 350 C140 370 90 370 90 350 Z"/>
  <path d="M422 290 C422 270 372 270 372 290 L372 350 C372 370 422 370 422 350 Z"/>
  <path d="M392 350 C392 410 330 420 290 420"/>
  <path d="M250 400 L290 400 L290 440 L250 440 Z"/>
`, [{ x: 110, y: 360, len: 55, w: 6 }, { x: 402, y: 360, len: 55, w: 6 }], { sw: 13 });

// ── UI icons (topbar / controls) — same hand-drawn family, no drips so they
//    stay crisp at small sizes in the chrome ───────────────────────────────
function uiSvg(id, body, sw = 18) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" fill="none">
${defs(id)}
  <g filter="url(#rough_${id})" stroke="${LIME}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none">
${body}
  </g>
</svg>`;
}

// 25) SEARCH
assets.search = uiSvg(25, `
  <circle cx="220" cy="220" r="140"/>
  <path d="M322 322 L430 430"/>
`);

// 26) BELL
assets.bell = uiSvg(26, `
  <path d="M380 330 C380 200 340 110 256 110 C172 110 132 200 132 330 C132 360 90 380 90 380 L422 380 C422 380 380 360 380 330 Z"/>
  <path d="M210 420 C220 445 292 445 302 420"/>
  <path d="M256 110 L256 80"/>
`);

// 27) GEAR / settings
assets.gear = uiSvg(27, `
  <circle cx="256" cy="256" r="70"/>
  <path d="M256 110 L256 60 M256 452 L256 402 M402 256 L452 256 M60 256 L110 256
    M358 154 L394 118 M118 394 L154 358 M358 358 L394 394 M118 118 L154 154"/>
`, 16);

// 28) MAIL / envelope
assets.mail = uiSvg(28, `
  <rect x="70" y="120" width="372" height="272" rx="20"/>
  <path d="M86 150 L256 286 L426 150"/>
`);

// 29) EXIT / sign-out
assets.exit = uiSvg(29, `
  <path d="M200 110 L120 110 C104 110 90 124 90 140 L90 372 C90 388 104 402 120 402 L200 402"/>
  <path d="M330 170 L420 256 L330 342"/>
  <path d="M420 256 L190 256"/>
`);

// 30) PLUS / add
assets.plus = uiSvg(30, `
  <path d="M256 110 L256 402 M110 256 L402 256"/>
`, 20);

// 31) CLOSE / x
assets.close = uiSvg(31, `
  <path d="M140 140 L372 372 M372 140 L140 372"/>
`, 20);

// 32) FILTER
assets.filter = uiSvg(32, `
  <path d="M80 120 L432 120 L300 280 L300 400 L212 360 L212 280 Z"/>
`);

// 33) NOTE / pencil
assets.note = uiSvg(33, `
  <path d="M110 150 L300 150 M110 230 L370 230 M110 310 L260 310"/>
  <path d="M330 360 L420 270 L450 300 L360 390 L320 400 Z"/>
`);

// 34) CALENDAR
assets.calendar = uiSvg(34, `
  <rect x="80" y="110" width="352" height="312" rx="22"/>
  <path d="M80 190 L432 190 M170 80 L170 140 M342 80 L342 140"/>
`);

// 35) CHECK
assets.check = uiSvg(35, `
  <path d="M110 270 L210 370 L410 140"/>
`, 22);

// ── Wide motifs (underlines, drip strips) ───────────────────────────────────
// Same rough hand-drawn filter, but on a banner-shaped viewBox.
function band(id, body, { w = 360, h = 48, sw = 9 } = {}, drips = []) {
  const dripEls = drips.map((d) => drip(d.x, d.y, d.len, d.w)).join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none">
${defs(id)}
  <g filter="url(#rough_${id})" stroke="${LIME}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" fill="none">
${body}
  </g>
  <g filter="url(#rough_${id})">
${dripEls}
  </g>
</svg>`;
}

// 36) UNDERLINE — a double graffiti swipe under section headings
assets.underline = band(36, `
  <path d="M12 28 C72 16 152 38 212 24 C272 12 322 30 350 18"/>
  <path d="M18 41 C96 33 184 47 252 35 C300 27 332 41 352 32"/>
`, { w: 360, h: 48, sw: 8 });

// 37) DRIPS — a top edge with paint runnels hanging down (login hero)
assets.drips = band(37, `
  <path d="M4 12 C120 4 240 4 356 12"/>
`, { w: 360, h: 96, sw: 9 }, [
  { x: 38, y: 12, len: 34, w: 8 }, { x: 92, y: 12, len: 60, w: 9 },
  { x: 150, y: 12, len: 24, w: 7 }, { x: 212, y: 12, len: 72, w: 10 },
  { x: 270, y: 12, len: 42, w: 8 }, { x: 324, y: 12, len: 54, w: 9 },
]);

// 38) SCRIBBLE-ARROW — a loose hand-drawn arrow for empty states
assets["arrow-down"] = svg(38, `
  <path d="M256 92 C198 196 332 250 258 398"/>
  <path d="M210 344 L258 404 L304 344"/>
`, [], { sw: 18 });

// ── Write all SVGs ──────────────────────────────────────────────────────────
for (const [name, content] of Object.entries(assets)) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), content.trim() + "\n");
}
console.log(`Wrote ${Object.keys(assets).length} SVGs to public/brand:`);
console.log(Object.keys(assets).join(", "));
