# WhatsApp Business Integration — Setup (Meta Cloud API)

ONE business number for the whole team — no per-rep login:
- **Send** — compose a WhatsApp from a contact's timeline (WhatsApp tab in the
  Activity panel). Logged automatically.
- **Receive** — inbound replies are matched to the contact by phone number and
  logged onto their timeline.

> Uses the **WhatsApp Cloud API** (hosted by Meta — no third party). You'll need
> a Meta developer app, a WhatsApp Business Account (WABA), and a phone number.

---

## 1. Create the Meta app + WhatsApp product

1. Go to **https://developers.facebook.com/apps** → **Create app** →
   choose **Business** → finish.
2. On the app dashboard → **Add product** → **WhatsApp** → **Set up**.
3. This creates a test WhatsApp Business Account and a **test number** you can
   use immediately (add your own number as a recipient to test).
4. In **WhatsApp → API setup**, copy:
   - **Phone number ID** (under the "From" number) → `WHATSAPP_PHONE_NUMBER_ID`
   - A **temporary access token** (good for 24h — for a first test only).

For production, create a **permanent token**:
- **Business Settings → Users → System users** → create a system user (Admin).
- **Add assets** → assign your app with full control.
- **Generate token** → select the app → scopes **`whatsapp_business_messaging`**
  and **`whatsapp_business_management`** → copy the token → `WHATSAPP_ACCESS_TOKEN`.

---

## 2. Environment variables in Vercel

**Project → Settings → Environment Variables** (Production), then **Redeploy**:

| Variable | Value |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | the Phone number ID from API setup |
| `WHATSAPP_ACCESS_TOKEN` | the permanent system-user token |
| `WHATSAPP_VERIFY_TOKEN` | any string you invent (used in step 3) |
| `WHATSAPP_APP_SECRET` | *(recommended)* App → Settings → Basic → **App secret** |

> Tokens are secrets — put them straight into Vercel, not into chat.
> Without `WHATSAPP_APP_SECRET`, inbound webhooks still work but their signature
> isn't verified (less secure). With it, we reject any unsigned/forged callback.

---

## 3. Configure the webhook (for inbound replies)

In the app dashboard → **WhatsApp → Configuration → Webhook** → **Edit**:

- **Callback URL:** `https://<your-app>/api/integrations/whatsapp/webhook`
  (e.g. `https://layers-weave.vercel.app/api/integrations/whatsapp/webhook`)
- **Verify token:** the exact value you set for `WHATSAPP_VERIFY_TOKEN`.
- Click **Verify and save** — Meta calls our endpoint and we echo the challenge.

Then **Manage** the webhook fields → subscribe to **`messages`**.

> Redeploy *before* clicking Verify and save, so the env vars are live.

---

## 4. Verify

- Open **`/api/integrations/whatsapp/status`** (admin). You want:
  - `configured: true`
  - `has_WHATSAPP_PHONE_NUMBER_ID: true`, `has_WHATSAPP_ACCESS_TOKEN: true`
  - `signatureEnforced: true` (if you set the app secret)
- In the app: open any contact **with a phone number** → Activity panel →
  **WhatsApp** tab → send a message. It should arrive on WhatsApp and appear on
  the timeline. Reply from the phone → the inbound message logs back.

---

## Notes / limits

- **24-hour window:** WhatsApp only allows free-form text within 24h of the
  customer's last message. Outside that window Meta requires a pre-approved
  **message template** — the send will return an error (shown as "Logged —
  connect WhatsApp to send for real" / an error in logs). Template sending can
  be added later if you need first-contact outreach.
- The contact must have a phone number on file (matched on the last 9 digits,
  same as call logging).
- One number serves the whole team; each outbound message records which rep sent
  it (shown on the timeline).
