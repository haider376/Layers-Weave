# Zoom Phone Integration — Setup

Two features from ONE Zoom Marketplace app:
- **Click-to-call** — a "Dial via Zoom" button on any contact + the cadence dialer
  rings the rep's Zoom Phone, which then calls the contact.
- **Auto call-logging** — completed Zoom Phone calls are logged into the CRM
  automatically (matched to contacts by phone number, with duration + recording).

Per-user OAuth (each rep connects their own Zoom), like Google.

> Requirements: a **Zoom Phone license** for calling, and admin rights to create
> a Zoom Marketplace app.

---

## 1. Create the Zoom OAuth app (~10 min)

1. Go to **https://marketplace.zoom.us/** → sign in → **Develop → Build App**.
2. Choose **General App** (OAuth).
3. **Basic Information**:
   - App name: "Layers Weave"
   - Choose **User-managed app** (each rep authorizes their own account).
4. **OAuth**:
   - **Redirect URL for OAuth** + add to **OAuth allow list**:
     `https://YOUR-DOMAIN/api/integrations/zoom/callback`
     (and `http://localhost:3000/api/integrations/zoom/callback` for dev)
5. **Scopes** — add:
   - `user:read:user`
   - `phone:read:user`
   - `phone:write:callout_call`  (this enables click-to-call)
6. Copy the **Client ID** and **Client Secret** from the app's **App Credentials**.

---

## 2. Webhook (for auto call-logging)

In the same app → **Feature → Event Subscriptions** (or "Access" → Webhook):
1. Add **Event notification endpoint URL**:
   `https://YOUR-DOMAIN/api/integrations/zoom/webhook`
2. Subscribe to these events (under **Zoom Phone**):
   - **All Calls Ended** / **Call Log Completed** (`phone.call_log_completed`)
   - optional: **Recording Completed** (`phone.recording_completed`)
3. Zoom shows a **Secret Token** for the subscription — copy it.
4. Click **Validate** — Zoom calls our endpoint; it answers the challenge
   automatically (no action needed) once the secret is set in step 3 below.

---

## 3. Environment variables (Vercel + local `.env`)

```
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
ZOOM_WEBHOOK_SECRET=...        # the Secret Token from the Event Subscription
```

`APP_URL` (already set for Google) is reused for the Zoom redirect/webhook URLs.

Redeploy after adding them.

---

## 4. Verify & use

- Admin diagnostics (no secrets shown):
  `https://YOUR-DOMAIN/api/integrations/zoom/status`
  → want `configured: true`, `has_ZOOM_WEBHOOK_SECRET: true`, and the
  `computed_redirectUri` / `webhookUrl` matching what you registered in Zoom.
- Each rep: **Coaching page → Connect Zoom** (or Settings → Integrations).
- **Click-to-call**: open a contact → Call tab → "Dial via Zoom" → your Zoom
  app rings; answer to place the call. Log the disposition as usual.
- **Auto-log**: any Zoom Phone call to/from a known contact number appears in
  Coaching automatically within a few seconds of the call ending.

---

## Notes
- Calls to **unknown numbers** (not matching any contact) are skipped, to avoid
  orphan call logs. Add the number to a contact and future calls will match.
- Click-to-call uses Zoom's "call_out" — the rep's device rings first, then
  dials the contact. This requires the rep's Zoom Phone to be set up.
- If Zoom isn't connected, the Dial button falls back to a `tel:` link.
