# Layers Wholesale CRM

A unified CRM that threads **one record across three teams — Sales → Supply → Logistics** —
replacing the split HubSpot + Notion setup. Built to the Layers build spec and matching the
design prototype exactly (deep blue-black theme, neon-green `#A0FD3A` accent, Montserrat +
PP Monument Extended).

> Next.js (App Router, TypeScript) + Prisma + **PostgreSQL** (matching the spec's
> Supabase recommendation). Permissions (margin wall, raghouse visibility) are enforced
> **server-side**, not just hidden in the UI.

## Quick start (local)

You need a Postgres database. The repo ships a `docker-compose.yml` for one:

```bash
cp .env.example .env   # local dev config (localhost Postgres + dev secrets)
docker compose up -d   # Postgres on localhost:5432 (matches .env)
npm install
npm run setup          # prisma generate + db push + seed demo data
npm run dev            # http://localhost:3000
```

No Docker? Point `DATABASE_URL` in `.env` at any Postgres instance (Neon, Supabase,
Vercel Postgres, a local install), then `npm run setup && npm run dev`.

Sign in with any seeded account (domain-restricted to `@layerswholesale.com`).
**Password for every demo user: `password`.**

## Deploy a shareable URL

See **[`DEPLOY.md`](./DEPLOY.md)** — import the repo into Vercel, add a Postgres
`DATABASE_URL`, deploy, then visit `/api/seed?key=…` once to load demo data.

| Email | Role | Sees margin? | Sees raghouse? |
|-------|------|:---:|:---:|
| `haider@layerswholesale.com` | CRO (admin) | ✅ | ✅ |
| `zikriya@layerswholesale.com` | Sales Manager (admin) | ✅ | ✅ |
| `rija@layerswholesale.com` | AE / QA (admin) | ✅ | ✅ |
| `shahiq@layerswholesale.com` | Head of Supply | ✅ | ✅ |
| `myra@layerswholesale.com` | Womenswear | ❌ | ✅ |
| `kamila@layerswholesale.com` | AE | ❌ | ❌ (no supply access) |
| `huzaifa@layerswholesale.com` | BDR | ❌ | ❌ |
| `waris@layerswholesale.com` | Logistics Coordinator | ❌ | ✅ (pickup source, logistics only) |
| `shahzaib@layerswholesale.com` | Lead Gen / CRM | ❌ | ❌ |

## What's implemented

**Foundation** — full data model (Company, Contact, Deal, Sales Meeting, Quote + line items,
Bulk/Handpick detail, Fulfilment, Raghouse, Carrier, User, plus approvals/activity/notifications),
the shared identity thread (`Client ID` / `Deal ID` / `Quote ID`), email/password auth restricted
to the company domain, role-based access, and profile-picture upload.

**Sales** — kanban across the 8 pipeline stages with drag-to-advance. Booking a meeting creates
the deal **and** meeting in one action; "Requested a quote" generates an `LQ-#####` quote and
advances the deal — no field entered twice.

**Supply** — quotes with inline-editable line items (Qty + Client target price are the required
fields), Bulk/Handpick routing, the **margin wall** and **raghouse visibility** rules, and the
**Consolidated demand** view that sums an item across quotes with a Quote-ID breakdown.

**Logistics** — fulfilment tracker with the door-to-door timeline. **Order type (Air/LCL/FCL)
is auto-derived from quantity and never set by hand.** Marking *Delivered* auto-notifies the client.

**Price Calculator** — markup tiers (5/15/20/25/30%) and shipping hike. **5% blocks "Save to quote"
and routes a CRO approval request.** Buying price & margin stay margin-walled.

**Dashboard** — live KPIs, pipeline funnel, AE leaderboard, cross-team activity feed.

### Automations (spec §8)
`#1` meeting booked → deal + meeting · `#2/#3` meeting status → deal stage · `#4` requested a quote
→ Initiation + `LQ-#####` · `#5` quote type → Bulk/Handpick routing · `#6` Closed Won → fulfilment +
notify Supply/Logistics · `#7` Delivered → notify client · `#9` total units → Order Type.

## Tests

```bash
node scripts/verify-permissions.mjs  # margin-wall + raghouse + route guards (run with the dev server up)
npx tsx scripts/verify-automations.ts # the §8 automation chain
```

(`verify-automations` writes & cleans up a throwaway record. Run `npm run db:reset` afterwards to
restore pristine demo data.)

## Stack & notes

- **Next.js 15** App Router, server components for data + server actions for mutations.
- **Prisma + PostgreSQL**. The server-side permission layer (`src/lib/permissions.ts`) maps
  directly onto Supabase Row-Level Security policies if/when you move to Supabase.
- `.env` ships with dev defaults so the app runs immediately against the bundled docker Postgres;
  rotate `SESSION_SECRET` / `SEED_SECRET` for any real deployment.
- Integrations (Zoom Phone, email/calendar, 3PL APIs) are phase-2 per the spec and stubbed in the UI
  (the "Zoom Phone connected" pill, click-to-log scaffolding).

## Open decisions (from the spec)
- **Adan Khalid (probation)** is currently seeded as a normal AE (`AE (Probation)` role, same access
  as an AE). Flip to capped/view-only in `src/lib/permissions.ts` if desired.
- **Consolidated demand** groups by exact item name (case-insensitive, trimmed). Looser matching
  (e.g. "Carhartt jacket" ≈ "Carhartt jackets") or grade-aware grouping can be added in
  `SupplyView.tsx`.
