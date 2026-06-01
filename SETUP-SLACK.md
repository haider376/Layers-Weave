# Slack Integration — Setup (Deal-won alerts)

ONE workspace-level connection — no per-user login. When a deal flips to
**Closed Won**, Layers Weave posts a celebratory message to a Slack channel.

> Uses a Slack **Incoming Webhook** (the simplest, safest option — no bot, no
> OAuth, no scopes to manage). The webhook is bound to exactly one channel.

---

## 1. Create a Slack app + Incoming Webhook

1. Go to **https://api.slack.com/apps** → **Create New App** → **From scratch**.
2. Name it `Layers Weave`, pick your workspace → **Create App**.
3. In the left sidebar → **Incoming Webhooks** → toggle **Activate Incoming Webhooks** on.
4. Click **Add New Webhook to Workspace**.
5. Choose the channel the alerts should land in (e.g. `#sales-wins`) → **Allow**.
6. Copy the **Webhook URL**. It's of the form
   `https://hooks.slack.com/services/<TEAM_ID>/<CHANNEL_ID>/<TOKEN>`.

> The webhook URL is a secret (anyone with it can post to your channel). Don't
> paste it in chat — put it straight into Vercel below.

---

## 2. Add the environment variables in Vercel

**Project → Settings → Environment Variables** (Production), then **Redeploy**:

| Variable | Value |
|---|---|
| `SLACK_WEBHOOK_URL` | the `https://hooks.slack.com/services/…` URL from step 1 |
| `SLACK_CHANNEL` | *(optional, display only)* e.g. `#sales-wins` |

Env vars only take effect on a **new deployment** — redeploy after saving.

---

## 3. Verify

- Open **`/api/integrations/slack/status`** (signed in as an admin). You want:
  - `configured: true`
  - `SLACK_WEBHOOK_URL_valid: true`
- Open **`/api/integrations/slack/test`** — it posts a "✅ connected" message to
  your channel. If it lands, you're done. (Settings → Integrations also has a
  **Send test** button once configured.)

---

## What fires an alert

Moving any deal to **Closed Won** (drag on the board, or via the deal drawer)
posts:

> 🎉 **Deal Won** — *Company* — $amount · Closed by *Owner* · Quote `LQ-#####`

The alert is best-effort: if Slack is down or misconfigured, the deal still
closes normally — nothing blocks on it.
