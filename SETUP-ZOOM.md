# Zoom Phone Integration — Setup (Server-to-Server)

ONE account-level connection powers the whole team — no per-rep login:
- **Click-to-call** — "Dial via Zoom" on any contact + the cadence dialer rings
  the rep's Zoom Phone (matched to their Zoom account by email), which dials out.
- **Auto call-logging** — completed Zoom Phone calls are logged into the CRM
  automatically (matched to contacts by phone number, with duration + recording).

> Requirements: Zoom **Server-to-Server OAuth** app + a **Zoom Phone** license
> on each rep that places calls.

---

## 1. The Server-to-Server OAuth app (you already created this)

App type shows **"Server-To-Server OAuth"** / **Account-level app**.

**App Credentials** tab → copy three values:
- **Account ID**
- **Client ID**
- **Client Secret**

**Scopes** tab → add (search and tick the **:admin** variants):
- `phone:read:call_log:admin` — "View a call log" **(required for auto-logging)**
- `phone:read:call_recording:admin` — "View a call recording" (recording links)
- `phone:read:user:admin` — "View a phone user"
- `user:read:user:admin` — "View a user"

Add a Scope description (Zoom requires one), then **Activate** the app.

> **Click-to-call (call_out) note:** placing calls *through the API* needs a
> `phone:write:callout_call` scope, which only appears on higher Zoom Phone /
> ISV tiers. If your account doesn't list a "Call Out" scope, that's fine —
> auto-logging works without it, and the "Dial via Zoom" button gracefully
> falls back to your device dialer.

---

## 2. Webhook (Feature → Event Subscriptions) — already done ✓

- Endpoint: `https://layers-weave.vercel.app/api/integrations/zoom/webhook`
- Event: **Call Log Completed** (`phone.call_log_completed`)
- Copy the **Secret Token**.

---

## 3. Environment variables (Vercel + local `.env`), then redeploy

```
ZOOM_ACCOUNT_ID=...
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
ZOOM_WEBHOOK_SECRET=...     # the Event Subscription Secret Token
```

No OAuth redirect URL is needed for Server-to-Server (that's why the "Connect"
button / redirect doesn't exist for this app type).

---

## 4. Verify & use

- Admin check: `https://layers-weave.vercel.app/api/integrations/zoom/status`
  → want `configured: true` and `tokenMintable: true` (proves the account
  credentials work).
- There's **no per-rep Connect** — once the env vars are set, it's live for
  everyone. The Coaching page shows "Zoom Phone · Active".
- **Click-to-call**: contact → Call tab → "Dial via Zoom" → your Zoom rings.
- **Auto-log**: any Zoom Phone call to/from a known contact number appears in
  Coaching within seconds of ending.

---

## Notes
- Click-to-call matches the signed-in rep to their Zoom user **by email**, so a
  rep's CRM email must equal their Zoom account email.
- Calls to **unknown numbers** (not on any contact) are skipped (no orphan logs).
- Needs a Zoom Phone license on the calling rep.
