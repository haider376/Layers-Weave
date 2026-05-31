# Google Calendar Integration — Setup

This connects each user's **Google Calendar** to Layers Weave so they can:
- Create events from the in-app Create modal (with attendees → real Google invites)
- See their Google events alongside meetings/tasks on the calendar

It's **per-user OAuth** — every rep connects their own Google account from
**Calendar → sidebar → Connect**, or **Settings → Integrations → Google Calendar**.

---

## 1. Create the Google OAuth app (one-time, ~10 min)

1. Go to **https://console.cloud.google.com/** and create (or pick) a project.
2. **APIs & Services → Library →** enable the **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **Internal** (if your Google Workspace is `layerswholesale.*`)
     — this skips Google's app-verification review. Use **External** only if reps
     are on personal Gmail.
   - Fill app name (“Layers Weave”), support email, developer email. Save.
   - Scopes: you don't need to pre-add them; the app requests them at runtime.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs** — add BOTH:
     - `https://YOUR-DOMAIN/api/integrations/google/callback`  (production)
     - `http://localhost:3000/api/integrations/google/callback` (local dev)
   - Create → copy the **Client ID** and **Client secret**.

---

## 2. Add environment variables

In **Vercel → Project → Settings → Environment Variables** (and your local `.env`):

```
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxxxxx
APP_URL=https://your-production-domain        # canonical https origin
```

Notes:
- `APP_URL` must exactly match the domain in your redirect URI. On Vercel it
  auto-falls back to `VERCEL_URL` if `APP_URL` is unset, but setting it
  explicitly avoids preview-URL mismatches.
- No code change is needed — the app reads these at runtime. Until they're set,
  the UI shows “Not configured yet (admin setup)”.

---

## 3. Database

The integration stores tokens in a new **`Integration`** table. It's created
automatically on deploy by `prisma db push` (in `vercel-build`) and is also part
of the `/api/seed` heal SQL, so no manual migration is needed.

---

## 4. Use it

1. Deploy (or `npm run dev` locally) with the env vars set.
2. Open **Calendar** → click **Connect** in the “Google Calendar” sidebar box
   (or Settings → Integrations).
3. Approve the Google consent screen → you're redirected back; the calendar now
   shows your Google events (lime “Google Calendar” calendar) and the **Create**
   modal pushes new events to Google with email invites to attendees.
4. **Disconnect** any time from the same place.

---

## How it works (for future maintainers)

- `src/lib/google.ts` — OAuth URL building, token exchange, **auto-refresh** of
  expired access tokens, and the Calendar REST calls (`list` / `create`).
- `src/app/api/integrations/google/connect/route.ts` — starts OAuth (sets a CSRF
  `state` cookie, redirects to Google).
- `src/app/api/integrations/google/callback/route.ts` — validates `state`,
  exchanges the code, stores tokens per user, redirects back with `?gcal=…`.
- `src/app/actions/google.ts` — `createCalendarEventAction` (used by the Create
  modal) and `disconnectGoogleAction`.
- Tokens live in the `Integration` table keyed by `(userId, provider)`. Refresh
  tokens are preserved across re-auth; access tokens refresh transparently.

Scopes requested: `calendar.events`, `calendar.readonly`, `openid`, `email`.
