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
    ["About", "about.html"]
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
      '<a class="btn btn--primary" href="start-project.html">Start a Project</a>' +
      '</div>' +
      '<div class="nav-right">' +
      '<a class="btn btn--primary" href="start-project.html">Start a Project</a>' +
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

  /* ---------- forms (Web3Forms → email) ---------- */
  // ▼▼▼ PASTE YOUR WEB3FORMS ACCESS KEY BETWEEN THE QUOTES ▼▼▼
  var WEB3FORMS_KEY = "YOUR-WEB3FORMS-ACCESS-KEY";
  // ▲▲▲ get it free at web3forms.com (it routes submissions to your email) ▲▲▲

  var FORM_MESSAGES = {
    enquiry: ["Thank you.", "We’ve received your enquiry and will be in touch within two working days."],
    contact: ["Thank you.", "We’ve received your message and will reply within two working days."],
    artist: ["Thank you for applying.", "We review every application individually and will be in touch if we believe there’s a good fit."],
    "start-project": ["Thank you.", "A member of the Pattern team will review your enquiry and arrange a consultation to discuss your project."],
    newsletter: ["Thank you.", "You’re on the list."]
  };
  var FORM_SUBJECTS = {
    artist: "New Artist Application — Pattern",
    "start-project": "New Project Enquiry — Pattern",
    enquiry: "New Project Enquiry — Pattern",
    contact: "New Contact Message — Pattern",
    newsletter: "New Newsletter Signup — Pattern"
  };

  function showSuccess(form, kind) {
    var msg = FORM_MESSAGES[kind] || ["Thank you.", "We’ve received your submission and will be in touch shortly."];
    var success = document.createElement("div");
    success.className = "form-success reveal in";
    success.innerHTML = '<strong>' + msg[0] + '</strong><p style="margin-top:.5rem;color:var(--ink-dim)">' + msg[1] + '</p>';
    form.replaceWith(success);
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function initForms() {
    var keyed = WEB3FORMS_KEY && WEB3FORMS_KEY.indexOf("YOUR-") !== 0;
    $$("form[data-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var kind = form.getAttribute("data-form");

        // No key configured yet → keep the graceful visual confirmation.
        if (!keyed) {
          if (kind === "newsletter") { form.innerHTML = '<p class="form-note" style="color:var(--accent)">Thank you — you\'re on the list.</p>'; return; }
          showSuccess(form, kind);
          return;
        }

        var btn = form.querySelector('button[type="submit"], button:not([type])');
        var btnHtml = btn ? btn.innerHTML : null;
        if (btn) { btn.disabled = true; btn.innerHTML = "Sending…"; }

        var fd = new FormData();
        fd.append("access_key", WEB3FORMS_KEY);
        fd.append("subject", FORM_SUBJECTS[kind] || "New submission — Pattern");
        fd.append("from_name", "Pattern Website");
        fd.append("botcheck", "");
        $$("input, textarea, select", form).forEach(function (el) {
          if (!el.name || el.type === "file") return;
          if ((el.type === "checkbox" || el.type === "radio") && !el.checked) return;
          fd.append(el.name, el.value);
        });

        fetch("https://api.web3forms.com/submit", { method: "POST", body: fd })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.success) {
              if (kind === "newsletter") { form.innerHTML = '<p class="form-note" style="color:var(--accent)">Thank you — you\'re on the list.</p>'; }
              else { showSuccess(form, kind); }
            } else { throw new Error("submit failed"); }
          })
          .catch(function () {
            if (btn) { btn.disabled = false; btn.innerHTML = btnHtml; }
            var note = form.querySelector(".form-error");
            if (!note) {
              note = document.createElement("p");
              note.className = "form-note form-error";
              note.style.color = "var(--red, #d2693f)";
              form.appendChild(note);
            }
            note.textContent = "Sorry — something went wrong sending that. Please try again, or email us directly.";
          });
      });
    });
  }

  /* ---------- media helpers (real photo, else generative artframe) ---------- */
  function photoFrame(ratioCls, src, alt, extra) {
    return '<div class="ratio ' + ratioCls + ' photo' + (extra || '') + '">' +
      '<img src="' + src + '" alt="' + (alt || '').replace(/"/g, '&quot;') + '" loading="lazy" /></div>';
  }
  function artFrame(ratioCls, seed, ratioKey, extra) {
    return '<div class="ratio ' + ratioCls + (extra || '') + '">' +
      '<div class="artframe" data-seed="' + seed + '" data-ratio="' + ratioKey + '"></div></div>';
  }

  /* ---------- project card markup ---------- */
  function projectCard(p) {
    if (p.comingSoon) {
      return '' +
        '<div class="project-card project-card--soon reveal" aria-disabled="true">' +
        '<div class="ratio ratio--4x5">' +
          '<div class="artframe" data-seed="' + p.seed + '" data-ratio="4x5"></div>' +
          '<span class="soon-badge">Coming soon</span>' +
        '</div>' +
        '<div class="project-card__meta">' +
          '<span class="project-card__cat">' + p.category + '</span>' +
          '<h3 class="project-card__title">' + p.title + '</h3>' +
          '<p class="project-card__summary">' + p.summary + '</p>' +
        '</div></div>';
    }
    var thumb = p.cover
      ? photoFrame("ratio--4x5", p.cover, p.title)
      : artFrame("ratio--4x5", p.seed, "4x5");
    return '' +
      '<a class="project-card reveal" href="project.html?p=' + p.slug + '">' +
      thumb +
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
    mount.innerHTML = window.PATTERN_PROJECTS.filter(function (p) { return p.featured && p.published; }).map(projectCard).join("");
  }

  function renderProjects() {
    var mount = $("#all-projects");
    if (!mount || !window.PATTERN_PROJECTS) return;
    var data = window.PATTERN_PROJECTS.filter(function (p) { return p.published; });
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

    var related = data.filter(function (x) { return x.slug !== p.slug && x.published; }).slice(0, 3);
    var gallery;
    if (p.images && p.images.length) {
      gallery = p.images.map(function (im, i) {
        var span = i === 0 ? " span-2" : "";
        var cls = i === 0 ? "ratio--16x9" : "ratio--1x1";
        return photoFrame(cls, im.src, im.alt, span + " reveal");
      }).join("");
    } else {
      gallery = p.gallery.map(function (seed, i) {
        var span = i === 0 ? " span-2" : "";
        var ratio = i === 0 ? "16x9" : "1x1";
        var cls = i === 0 ? "ratio--16x9" : "ratio--1x1";
        return artFrame(cls, seed, ratio, span + " reveal");
      }).join("");
    }

    var heroImg = p.hero || p.cover;
    var heroBlock = heroImg
      ? '<div class="ratio photo reveal in"><img src="' + heroImg + '" alt="' + p.title.replace(/"/g, "&quot;") + '" /></div>'
      : '<div class="ratio reveal in"><div class="artframe" data-seed="' + p.seed + '" data-ratio="21x9"></div></div>';

    mount.innerHTML = '' +
      '<section class="cs-hero">' + heroBlock + '</section>' +
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
        (p.video
          ? '<div class="section--tight"><span class="eyebrow reveal">Film</span>' +
              '<div class="ratio ratio--16x9 reveal mt-2"><iframe src="' + p.video + '" title="' + p.title.replace(/"/g, "&quot;") + ' — film" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border:0;width:100%;height:100%"></iframe></div>' +
            '</div>'
          : '') +
      '</div>' +
      '<section class="section"><div class="container">' +
        '<div class="section-head reveal"><span class="eyebrow">Keep exploring</span><h2 style="font-size:clamp(1.8rem,4vw,2.8rem);margin-top:.8rem">Related projects</h2></div>' +
        '<div class="project-grid project-grid--featured">' + related.map(projectCard).join("") + '</div>' +
      '</div></section>' +
      '<section class="banner"><div class="banner__bg artframe" data-seed="' + (p.seed + 12) + '" data-ratio="21x9"></div>' +
        '<div class="container"><h2 class="display reveal">Let’s create something memorable together.</h2>' +
        '<a class="btn btn--primary reveal" data-delay="1" href="start-project.html">Start Your Project <span class="arrow">→</span></a></div>' +
      '</section>';
  }

  /* ---------- before / after compare slider (drag to reveal) ---------- */
  function initCompare() {
    $$(".ba-slider").forEach(function (slider) {
      var after = slider.querySelector(".ba-slider__img--after");
      var handle = slider.querySelector(".ba-handle");
      if (!after || !handle) return;
      var dragging = false;

      function set(pct) {
        pct = Math.max(0, Math.min(100, pct));
        slider.style.setProperty("--pos", pct + "%");
        handle.setAttribute("aria-valuenow", Math.round(pct));
      }
      function pctFromEvent(e) {
        var rect = slider.getBoundingClientRect();
        var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        return (x / rect.width) * 100;
      }
      function start(e) {
        dragging = true;
        slider.removeAttribute("data-hint");
        set(pctFromEvent(e));
        if (e.pointerId != null && slider.setPointerCapture) {
          try { slider.setPointerCapture(e.pointerId); } catch (err) {}
        }
        e.preventDefault();
      }
      function move(e) { if (dragging) set(pctFromEvent(e)); }
      function end() { dragging = false; }

      // Pointer events cover mouse + touch + pen
      if (window.PointerEvent) {
        slider.addEventListener("pointerdown", start);
        slider.addEventListener("pointermove", move);
        window.addEventListener("pointerup", end);
        slider.addEventListener("pointercancel", end);
      } else {
        slider.addEventListener("mousedown", start);
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", end);
        slider.addEventListener("touchstart", start, { passive: false });
        slider.addEventListener("touchmove", function (e) { move(e); e.preventDefault(); }, { passive: false });
        window.addEventListener("touchend", end);
      }

      // Keyboard accessibility
      handle.addEventListener("keydown", function (e) {
        var cur = parseFloat(slider.style.getPropertyValue("--pos")) || 50;
        var step = e.shiftKey ? 10 : 2;
        if (e.key === "ArrowLeft") { set(cur - step); e.preventDefault(); }
        else if (e.key === "ArrowRight") { set(cur + step); e.preventDefault(); }
        else if (e.key === "Home") { set(0); e.preventDefault(); }
        else if (e.key === "End") { set(100); e.preventDefault(); }
      });

      set(50);
    });
  }

  /* ---------- lightbox (enlarge gallery photos) ---------- */
  function initLightbox() {
    var imgs = $$(".cs-gallery .photo img");
    if (!imgs.length) return;
    var idx = 0;
    var X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    var L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
    var R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';

    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.innerHTML =
      '<button class="lightbox__btn lightbox__close" aria-label="Close">' + X + '</button>' +
      '<button class="lightbox__btn lightbox__prev" aria-label="Previous image">' + L + '</button>' +
      '<button class="lightbox__btn lightbox__next" aria-label="Next image">' + R + '</button>' +
      '<img class="lightbox__img" alt="" />' +
      '<span class="lightbox__count"></span>' +
      '<p class="lightbox__cap"></p>';
    document.body.appendChild(lb);

    var imgEl = lb.querySelector(".lightbox__img");
    var capEl = lb.querySelector(".lightbox__cap");
    var countEl = lb.querySelector(".lightbox__count");

    function show(i) {
      idx = (i + imgs.length) % imgs.length;
      imgEl.src = imgs[idx].getAttribute("src");
      var alt = imgs[idx].getAttribute("alt") || "";
      imgEl.alt = alt; capEl.textContent = alt;
      countEl.textContent = (idx + 1) + " / " + imgs.length;
    }
    function open(i) { show(i); lb.classList.add("open"); document.body.style.overflow = "hidden"; }
    function close() { lb.classList.remove("open"); document.body.style.overflow = ""; }

    imgs.forEach(function (im, i) { im.addEventListener("click", function () { open(i); }); });
    lb.querySelector(".lightbox__close").addEventListener("click", close);
    lb.querySelector(".lightbox__prev").addEventListener("click", function (e) { e.stopPropagation(); show(idx - 1); });
    lb.querySelector(".lightbox__next").addEventListener("click", function (e) { e.stopPropagation(); show(idx + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  /* ---------- scroll-reveal parallax ---------- */
  function initParallax() {
    var els = $$("[data-parallax]");
    if (!els.length) return;
    var imgs = els.map(function (el) { return el.querySelector("img"); });
    function update() {
      var vh = window.innerHeight;
      els.forEach(function (el, i) {
        var img = imgs[i];
        if (!img) return;
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return; // skip off-screen
        var prog = (vh - r.top) / (vh + r.height); // 0 entering, 1 leaving
        prog = Math.max(0, Math.min(1, prog));
        var py = (0.5 - prog) * 16; // image drifts up as you scroll down → reveals lower part
        img.style.transform = "translateY(" + py.toFixed(2) + "%)";
      });
    }
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
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
    initCompare();
    initLightbox();
    initParallax();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
