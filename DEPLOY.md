# Deploy to a shareable URL (Vercel + Postgres)

This gets you a live link in ~5 minutes. Everything in the codebase is already
deploy-ready — you just create two free accounts and paste a couple of values.

## 1. Create a Postgres database (free)

Use any Postgres host. Easiest options:

- **Vercel Postgres** — create it from the Vercel dashboard in step 2 (Storage tab), or
- **Neon** (https://neon.tech) — New Project → copy the connection string. It looks like:
  `postgresql://USER:PASSWORD@HOST/DB?sslmode=require`

Keep that connection string handy.

## 2. Import the repo into Vercel

1. Go to https://vercel.com → **Add New… → Project**.
2. Import the GitHub repo `haider376/layers-weave` and pick the branch
   `claude/magical-pascal-dw4kz` (or merge it to `main` first).
3. Framework preset auto-detects **Next.js** — leave the defaults. The build command is
   `npm run vercel-build` (already set in `package.json`; it runs `prisma generate`,
   pushes the schema to your database, then builds).

## 3. Set environment variables

In the Vercel project → **Settings → Environment Variables**, add:

| Name | Value |
|------|-------|
| `DATABASE_URL` | your Postgres connection string from step 1 |
| `SESSION_SECRET` | any long random string |
| `ALLOWED_EMAIL_DOMAIN` | `layerswholesale.com` |
| `SEED_SECRET` | any random string (used once, next step) |

Then **Deploy**.

## 4. Load the demo data (one time)

After the first deploy succeeds, visit this URL once (swap in your domain + the
`SEED_SECRET` you chose):

```
https://YOUR-APP.vercel.app/api/seed?key=YOUR_SEED_SECRET
```

You should see `{"ok":true,...}`. That populates the 13 users, quotes, and shipments.

## 5. Sign in

Open `https://YOUR-APP.vercel.app` and log in with any seeded account, e.g.
**`haider@layerswholesale.com` / `password`** (CRO — sees everything). See the table in
`README.md` for the other roles (AE, Supply, Logistics, etc.).

---

### Notes
- The build pushes the schema with `prisma db push`. For a team/production setup you'd switch
  to versioned migrations (`prisma migrate deploy`); push is fine for this demo.
- Re-hitting `/api/seed` **resets** the demo data to a clean state — handy, but don't run it
  after people have entered real test data they want to keep.
- Change every seeded user's password before sharing the link widely (they all start as
  `password`).
