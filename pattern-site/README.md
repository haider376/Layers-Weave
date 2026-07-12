# PATTERN — website

A premium, minimal, photography-led marketing site for **Pattern** — a studio
connecting businesses with contemporary artists to create memorable spaces,
original artwork and content.

> This is a self-contained static site. It lives alongside, but is entirely
> independent of, the Layers/Weave CRM in this repository. It has no build
> step, no dependencies and no backend.

## Design language

- **Charcoal black** background, **off-white** typography, **burnt orange** accent
- Display serif (*Fraunces*) paired with a clean sans (*Inter*)
- Generous spacing, large imagery, gallery-like restraint
- Sticky translucent header, mobile nav, scroll-reveal animations

## Run it

It's plain HTML/CSS/JS — just serve the folder:

```bash
cd pattern-site
python3 -m http.server 8000
# then open http://localhost:8000
```

Or open `index.html` directly in a browser.

## Structure

```
pattern-site/
├── index.html              Home (hero, why, services, work, process, philosophy, for-artists, founding venue, CTA)
├── for-businesses.html     Services, process, Founding Venue Programme, enquiry
├── for-artists.html        Beliefs, who we work with, benefits, how it works, founding artist programme, FAQ
├── artist-application.html Full artist application form (multi-section)
├── start-project.html      Full customer enquiry form (multi-section)
├── projects.html           Filterable project grid + galleries
├── project.html            Dynamic case study (reads ?p=<slug>)
├── about.html              Story, manifesto, what we do, looking forward, founder profile
├── contact.html            Simple contact form + details
├── css/styles.css          Design system & components
└── js/
    ├── projects-data.js    Single source of truth for all projects
    └── main.js             Header/footer injection, generative artwork, interactions, form handling
```

### Key CTA destinations

- **Start a Project / Book a Consultation / Enquire Now** → `start-project.html`
- **Apply / Apply Now / Apply to Join** → `artist-application.html`

## Notes

- **Imagery:** real photography is the intended visual identity. Until assets are
  supplied, each project renders a unique, deterministic generative "artwork"
  (seeded SVG in the brand palette) so layouts are fully realised. Swap the
  `.artframe` placeholders for `<img>`/`<video>` when assets are ready.
- **Header & footer** are injected by `main.js` (mounted at `#header-mount` /
  `#footer-mount`) so navigation stays consistent across every page.
- **Forms** validate client-side and show a confirmation state. Wire the
  `form[data-form="…"]` submit handlers in `main.js` to a real endpoint to go live.
- **Adding a project:** add an entry to `js/projects-data.js`; it appears on the
  projects grid, the home page (if `featured: true`) and gets its own case study
  at `project.html?p=<slug>`.
