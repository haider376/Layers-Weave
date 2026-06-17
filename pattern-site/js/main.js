/* =====================================================================
   PATTERN — site behaviour
   - shared header / footer injection (keeps every page consistent)
   - generative "artwork" placeholders (premium image stand-ins)
   - sticky header, mobile nav, scroll reveal, form handling
   - project rendering for home / projects / case-study pages
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- small helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* deterministic PRNG so each seed paints the same artwork every load */
  function rng(seed) {
    var s = (seed * 2654435761) % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  /* ---------- generative artwork (image substitute) ----------
     Charcoal field, restrained off-white geometry, burnt-orange accent.
     Reads as abstract contemporary art rather than a placeholder box. */
  var PALETTE = {
    bg: ["#17120f", "#14110f", "#1a1411", "#121110"],
    dark: ["#211a16", "#26201b", "#2c241e"],
    ink: "#efe9df",
    accent: "#c2562c",
    accent2: "#d76e3f",
    accentDeep: "#8f3c1d"
  };

  function artSVG(seed, w, h) {
    w = w || 800; h = h || 1000;
    var r = rng(seed);
    var pick = function (a) { return a[Math.floor(r() * a.length)]; };
    var bg = pick(PALETTE.bg);
    var variant = Math.floor(r() * 4);
    var parts = [];

    parts.push('<rect width="' + w + '" height="' + h + '" fill="' + bg + '"/>');

    // soft tonal field
    var gx = Math.floor(r() * w), gy = Math.floor(r() * h);
    parts.push('<defs>' +
      '<radialGradient id="g' + seed + '" cx="' + (gx / w * 100).toFixed(1) + '%" cy="' + (gy / h * 100).toFixed(1) + '%" r="75%">' +
      '<stop offset="0%" stop-color="' + pick(PALETTE.dark) + '"/>' +
      '<stop offset="100%" stop-color="' + bg + '"/>' +
      '</radialGradient>' +
      '<filter id="b' + seed + '"><feGaussianBlur stdDeviation="' + (8 + r() * 26).toFixed(1) + '"/></filter>' +
      '</defs>');
    parts.push('<rect width="' + w + '" height="' + h + '" fill="url(#g' + seed + ')"/>');

    if (variant === 0) {
      // horizon bands
      var bands = 3 + Math.floor(r() * 3), y = h * (0.25 + r() * 0.2);
      for (var i = 0; i < bands; i++) {
        var bh = (h / (bands + 2)) * (0.6 + r());
        var col = r() < 0.32 ? PALETTE.accentDeep : pick(PALETTE.dark);
        parts.push('<rect x="0" y="' + y.toFixed(0) + '" width="' + w + '" height="' + bh.toFixed(0) + '" fill="' + col + '" opacity="' + (0.5 + r() * 0.4).toFixed(2) + '"/>');
        y += bh * (0.7 + r() * 0.6);
      }
      parts.push('<rect x="0" y="' + (h * (0.55 + r() * 0.25)).toFixed(0) + '" width="' + w + '" height="' + (4 + r() * 7).toFixed(0) + '" fill="' + PALETTE.accent + '"/>');
    } else if (variant === 1) {
      // orbital circles
      var cx = w * (0.3 + r() * 0.4), cy = h * (0.3 + r() * 0.4);
      var rings = 4 + Math.floor(r() * 4);
      for (var k = 0; k < rings; k++) {
        var rad = (Math.min(w, h) * 0.12) * (k + 1) * (0.7 + r() * 0.3);
        var stroke = k === Math.floor(rings / 2) ? PALETTE.accent : pick(PALETTE.dark);
        parts.push('<circle cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" r="' + rad.toFixed(0) + '" fill="none" stroke="' + stroke + '" stroke-width="' + (1 + r() * 2.5).toFixed(1) + '" opacity="' + (0.5 + r() * 0.45).toFixed(2) + '"/>');
      }
      parts.push('<circle cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" r="' + (10 + r() * 26).toFixed(0) + '" fill="' + PALETTE.accent + '" opacity="0.9"/>');
    } else if (variant === 2) {
      // diagonal strata
      parts.push('<g transform="rotate(' + (-20 + r() * 40).toFixed(1) + ' ' + (w / 2) + ' ' + (h / 2) + ')">');
      var cols = 5 + Math.floor(r() * 4), x = -w * 0.3, step = (w * 1.6) / cols;
      for (var c = 0; c < cols; c++) {
        var cw = step * (0.25 + r() * 0.6);
        var fill = r() < 0.25 ? PALETTE.accent : (r() < 0.4 ? PALETTE.accentDeep : pick(PALETTE.dark));
        parts.push('<rect x="' + x.toFixed(0) + '" y="' + (-h * 0.3) + '" width="' + cw.toFixed(0) + '" height="' + (h * 1.6) + '" fill="' + fill + '" opacity="' + (0.45 + r() * 0.45).toFixed(2) + '"/>');
        x += step;
      }
      parts.push('</g>');
    } else {
      // gestural brush arcs
      for (var a = 0; a < 3 + Math.floor(r() * 3); a++) {
        var x1 = r() * w, y1 = r() * h, x2 = r() * w, y2 = r() * h;
        var cxp = r() * w, cyp = r() * h;
        var stroke2 = a === 0 ? PALETTE.accent : (r() < 0.5 ? PALETTE.ink : pick(PALETTE.dark));
        parts.push('<path d="M' + x1.toFixed(0) + ' ' + y1.toFixed(0) + ' Q' + cxp.toFixed(0) + ' ' + cyp.toFixed(0) + ' ' + x2.toFixed(0) + ' ' + y2.toFixed(0) + '" fill="none" stroke="' + stroke2 + '" stroke-width="' + (2 + r() * 30).toFixed(0) + '" stroke-linecap="round" opacity="' + (0.18 + r() * 0.4).toFixed(2) + '" filter="url(#b' + seed + ')"/>');
      }
      parts.push('<circle cx="' + (w * (0.2 + r() * 0.6)).toFixed(0) + '" cy="' + (h * (0.2 + r() * 0.6)).toFixed(0) + '" r="' + (16 + r() * 30).toFixed(0) + '" fill="' + PALETTE.accent + '"/>');
    }

    // grain dots for texture
    var dots = '';
    for (var d = 0; d < 26; d++) {
      dots += '<circle cx="' + (r() * w).toFixed(0) + '" cy="' + (r() * h).toFixed(0) + '" r="' + (r() * 1.4).toFixed(1) + '" fill="' + PALETTE.ink + '" opacity="' + (r() * 0.08).toFixed(3) + '"/>';
    }
    parts.push(dots);

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Artwork">' + parts.join('') + '</svg>';
  }

  function paintFrames() {
    $$(".artframe[data-seed]").forEach(function (el) {
      if (el.dataset.painted) return;
      var seed = parseInt(el.dataset.seed, 10) || 1;
      var ratio = el.dataset.ratio || "4x5";
      var dims = { "4x5": [800, 1000], "3x2": [1200, 800], "1x1": [900, 900], "16x9": [1280, 720], "21x9": [1680, 720] }[ratio] || [800, 1000];
      el.innerHTML = artSVG(seed, dims[0], dims[1]);
      el.dataset.painted = "1";
    });
  }

  /* ---------- header / footer markup ---------- */
  var NAV = [
    ["For Businesses", "for-businesses.html"],
    ["For Artists", "for-artists.html"],
    ["Projects", "projects.html"],
    ["About", "about.html"],
    ["Contact", "contact.html"]
  ];

  function igIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'; }
  function ytIcon() { return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.7-.47-5.46a2.86 2.86 0 0 0-2-2C18.75 4 12 4 12 4s-6.75 0-8.53.54a2.86 2.86 0 0 0-2 2C1 8.3 1 12 1 12s0 3.7.47 5.46a2.86 2.86 0 0 0 2 2C5.25 20 12 20 12 20s6.75 0 8.53-.54a2.86 2.86 0 0 0 2-2C23 15.7 23 12 23 12zM10 15.5v-7l6 3.5z"/></svg>'; }
  function mailIcon() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'; }

  function buildHeader() {
    var here = location.pathname.split("/").pop() || "index.html";
    var links = NAV.map(function (n) {
      var active = n[1] === here ? " class=\"active\"" : "";
      return '<a href="' + n[1] + '"' + active + '>' + n[0] + '</a>';
    }).join("");
    return '' +
      '<header class="site-header" id="siteHeader">' +
      '<nav class="nav" aria-label="Primary">' +
      '<a class="brand" href="index.html">PATTERN</a>' +
      '<div class="nav-links" id="navLinks">' + links +
      '<a class="btn btn--primary" href="contact.html">Start a Project</a>' +
      '</div>' +
      '<div class="nav-right">' +
      '<a class="btn btn--primary" href="contact.html">Start a Project</a>' +
      '<button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '</div>' +
      '</nav></header>';
  }

  function buildFooter() {
    var IG = "https://instagram.com", YT = "https://youtube.com", EMAIL = "hello@pattern.studio";
    var nav = NAV.map(function (n) { return '<li><a href="' + n[1] + '">' + n[0] + '</a></li>'; }).join("");
    return '' +
      '<footer class="site-footer">' +
      '<div class="container">' +
      '<div class="footer-top">' +
        '<div class="footer-brand">' +
          '<a href="index.html" class="brand">PATTERN</a>' +
          '<p class="tagline">Art. Spaces. Opportunities.</p>' +
        '</div>' +
        '<div class="footer-col"><h4>Explore</h4><ul>' + nav + '</ul></div>' +
        '<div class="footer-col"><h4>Connect</h4><ul>' +
          '<li><a href="' + IG + '" target="_blank" rel="noopener">Instagram</a></li>' +
          '<li><a href="' + YT + '" target="_blank" rel="noopener">YouTube</a></li>' +
          '<li><a href="mailto:' + EMAIL + '">' + EMAIL + '</a></li>' +
        '</ul></div>' +
        '<div class="footer-col newsletter"><h4>Newsletter</h4>' +
          '<p>New projects, artist features and openings — occasionally, never spam.</p>' +
          '<form data-form="newsletter"><input type="email" name="email" placeholder="Email address" aria-label="Email address" required><button type="submit">Join</button></form>' +
        '</div>' +
      '</div>' +
      '<div class="footer-bottom">' +
        '<p>© ' + new Date().getFullYear() + ' Pattern. All rights reserved.</p>' +
        '<div class="social">' +
          '<a href="' + IG + '" target="_blank" rel="noopener" aria-label="Instagram">' + igIcon() + '</a>' +
          '<a href="' + YT + '" target="_blank" rel="noopener" aria-label="YouTube">' + ytIcon() + '</a>' +
          '<a href="mailto:' + EMAIL + '" aria-label="Email">' + mailIcon() + '</a>' +
        '</div>' +
      '</div>' +
      '</div></footer>';
  }

  function injectChrome() {
    var hMount = $("#header-mount");
    var fMount = $("#footer-mount");
    if (hMount) hMount.outerHTML = buildHeader();
    if (fMount) fMount.outerHTML = buildFooter();
  }

  /* ---------- sticky header + mobile nav ---------- */
  function initHeader() {
    var header = $("#siteHeader");
    var toggle = $("#navToggle");
    if (header && header.classList.contains("solid") === false) {
      var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 24); };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = document.body.classList.toggle("nav-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      $$("#navLinks a").forEach(function (a) {
        a.addEventListener("click", function () {
          document.body.classList.remove("nav-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }
  }

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- forms (no backend — graceful client-side confirmation) ---------- */
  function initForms() {
    $$("form[data-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var kind = form.getAttribute("data-form");
        if (kind === "newsletter") {
          var input = form.querySelector("input");
          form.innerHTML = '<p class="form-note" style="color:var(--accent)">Thank you — you\'re on the list.</p>';
          return;
        }
        var success = document.createElement("div");
        success.className = "form-success reveal in";
        success.innerHTML = '<strong>Thank you.</strong><p style="margin-top:.5rem;color:var(--ink-dim)">We\'ve received your enquiry and will be in touch within two working days.</p>';
        form.replaceWith(success);
      });
    });
  }

  /* ---------- project card markup ---------- */
  function projectCard(p) {
    return '' +
      '<a class="project-card reveal" href="project.html?p=' + p.slug + '">' +
      '<div class="ratio ratio--4x5"><div class="artframe" data-seed="' + p.seed + '" data-ratio="4x5"></div></div>' +
      '<div class="project-card__meta">' +
        '<span class="project-card__cat">' + p.category + '</span>' +
        '<h3 class="project-card__title">' + p.title + '</h3>' +
        '<p class="project-card__summary">' + p.summary + '</p>' +
        '<span class="project-card__view">View case study <span class="arrow">→</span></span>' +
      '</div></a>';
  }

  function renderFeatured() {
    var mount = $("#featured-projects");
    if (!mount || !window.PATTERN_PROJECTS) return;
    mount.innerHTML = window.PATTERN_PROJECTS.filter(function (p) { return p.featured; }).map(projectCard).join("");
  }

  function renderProjects() {
    var mount = $("#all-projects");
    if (!mount || !window.PATTERN_PROJECTS) return;
    var data = window.PATTERN_PROJECTS;
    var render = function (cat) {
      var list = cat === "All" ? data : data.filter(function (p) { return p.category === cat; });
      mount.innerHTML = list.map(projectCard).join("");
      paintFrames();
      initReveal();
    };
    render("All");
    $$(".filter").forEach(function (f) {
      f.addEventListener("click", function () {
        $$(".filter").forEach(function (x) { x.classList.remove("active"); });
        f.classList.add("active");
        render(f.dataset.cat);
      });
    });
  }

  /* ---------- case study ---------- */
  function renderCaseStudy() {
    var mount = $("#case-study");
    if (!mount || !window.PATTERN_PROJECTS) return;
    var slug = new URLSearchParams(location.search).get("p");
    var data = window.PATTERN_PROJECTS;
    var p = data.filter(function (x) { return x.slug === slug; })[0] || data[0];
    document.title = p.title + " — Pattern";

    var related = data.filter(function (x) { return x.slug !== p.slug; }).slice(0, 3);
    var gallery = p.gallery.map(function (seed, i) {
      var span = i === 0 ? " span-2" : "";
      var ratio = i === 0 ? "16x9" : "1x1";
      var cls = i === 0 ? "ratio--16x9" : "ratio--1x1";
      return '<div class="ratio ' + cls + span + ' reveal"><div class="artframe" data-seed="' + seed + '" data-ratio="' + ratio + '"></div></div>';
    }).join("");

    mount.innerHTML = '' +
      '<section class="cs-hero">' +
        '<div class="ratio reveal in"><div class="artframe" data-seed="' + p.seed + '" data-ratio="21x9"></div></div>' +
      '</section>' +
      '<div class="container">' +
        '<div class="section--tight">' +
          '<span class="eyebrow reveal">' + p.category + '</span>' +
          '<h1 class="display reveal" data-delay="1" style="margin-top:1rem;max-width:16ch">' + p.title + '</h1>' +
          '<dl class="cs-meta reveal" data-delay="2">' +
            '<div><dt>Client</dt><dd>' + p.client + '</dd></div>' +
            '<div><dt>Location</dt><dd>' + p.location + '</dd></div>' +
            '<div><dt>Year</dt><dd>' + p.year + '</dd></div>' +
            '<div><dt>Services</dt><dd>' + p.services.join(", ") + '</dd></div>' +
          '</dl>' +
        '</div>' +
        '<div class="cs-block reveal"><h2>Overview</h2><div><p>' + p.overview + '</p></div></div>' +
        '<hr class="divider">' +
        '<div class="cs-block reveal"><h2>The Brief</h2><div><p>' + p.brief + '</p></div></div>' +
        '<hr class="divider">' +
        '<div class="cs-block reveal"><h2>The Solution</h2><div><p>' + p.solution + '</p></div></div>' +
        '<hr class="divider">' +
        '<div class="cs-block reveal"><h2>The Outcome</h2><div><p>' + p.outcome + '</p></div></div>' +
        '<div class="section--tight"><span class="eyebrow reveal">Gallery</span>' +
          '<div class="cs-gallery mt-2">' + gallery + '</div>' +
        '</div>' +
        '<div class="section--tight"><span class="eyebrow reveal">Optional Video</span>' +
          '<div class="ratio ratio--16x9 reveal mt-2" style="position:relative">' +
            '<div class="artframe" data-seed="' + (p.seed + 5) + '" data-ratio="16x9"></div>' +
            '<button aria-label="Play film" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">' +
              '<span style="width:78px;height:78px;border:1px solid rgba(243,240,233,.6);border-radius:50%;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)"><svg width="22" height="22" viewBox="0 0 24 24" fill="#f3f0e9"><path d="M8 5v14l11-7z"/></svg></span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<section class="section"><div class="container">' +
        '<div class="section-head reveal"><span class="eyebrow">Keep exploring</span><h2 style="font-size:clamp(1.8rem,4vw,2.8rem);margin-top:.8rem">Related projects</h2></div>' +
        '<div class="project-grid project-grid--featured">' + related.map(projectCard).join("") + '</div>' +
      '</div></section>' +
      '<section class="banner"><div class="banner__bg artframe" data-seed="' + (p.seed + 12) + '" data-ratio="21x9"></div>' +
        '<div class="container"><h2 class="display reveal">Let’s create something memorable together.</h2>' +
        '<a class="btn btn--primary reveal" data-delay="1" href="contact.html">Start Your Project <span class="arrow">→</span></a></div>' +
      '</section>';
  }

  /* ---------- boot ---------- */
  function boot() {
    injectChrome();
    renderFeatured();
    renderProjects();
    renderCaseStudy();
    paintFrames();
    initHeader();
    initReveal();
    initForms();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
