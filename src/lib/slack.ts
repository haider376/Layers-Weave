import "server-only";

// ── Slack — deal-won alerts (Incoming Webhook, account-level) ───────────────
//
// Setup (see SETUP-SLACK.md):
//   SLACK_WEBHOOK_URL    — Incoming Webhook URL from your Slack app
//   SLACK_CHANNEL        — (optional) channel label for display only, e.g. #sales-wins
//
// One webhook for the whole workspace — no per-user OAuth. When a deal flips to
// Closed Won we POST a Block Kit message to the channel the webhook is bound to.

function webhookUrl(): string {
  return (process.env.SLACK_WEBHOOK_URL ?? "").trim();
}

export function slackConfigured(): boolean {
  const u = webhookUrl();
  return u.startsWith("https://hooks.slack.com/");
}

export function slackChannelLabel(): string | null {
  const c = (process.env.SLACK_CHANNEL ?? "").trim();
  return c || null;
}

type SlackBlock = Record<string, unknown>;

// Low-level post. Returns the outcome instead of throwing so callers (e.g. a
// deal-stage automation) never fail their main job because Slack hiccupped.
export async function postSlack(input: { text: string; blocks?: SlackBlock[] }): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!slackConfigured()) return { ok: false, error: "not configured" };
  try {
    const res = await fetch(webhookUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: input.text, blocks: input.blocks }),
    });
    const body = await res.text();
    if (!res.ok || body.trim() !== "ok") return { ok: false, status: res.status, error: body.slice(0, 200) || `HTTP ${res.status}` };
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// Celebratory "deal won" alert. Best-effort — swallows its own errors.
export async function notifyDealWon(input: { company: string; amount: number; owner?: string | null; quoteId?: string | null; dealName?: string | null }): Promise<{ ok: boolean; error?: string }> {
  if (!slackConfigured()) return { ok: false, error: "not configured" };
  const lines = [
    `*${input.company}* — ${money(input.amount)}`,
    input.owner ? `Closed by *${input.owner}*` : null,
    input.quoteId ? `Quote \`${input.quoteId}\`` : null,
  ].filter(Boolean).join("  ·  ");

  const blocks: SlackBlock[] = [
    { type: "header", text: { type: "plain_text", text: "🎉 Deal Won", emoji: true } },
    { type: "section", text: { type: "mrkdwn", text: lines } },
    { type: "context", elements: [{ type: "mrkdwn", text: `Layers Weave · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` }] },
  ];
  const r = await postSlack({ text: `🎉 Deal Won — ${input.company} (${money(input.amount)})`, blocks });
  return { ok: r.ok, error: r.error };
}

// Admin diagnostics — never leaks the webhook URL, only its shape.
export function slackDiagnostics() {
  const u = webhookUrl();
  return {
    configured: slackConfigured(),
    has_SLACK_WEBHOOK_URL: !!u,
    SLACK_WEBHOOK_URL_valid: u.startsWith("https://hooks.slack.com/"),
    SLACK_WEBHOOK_URL_length: u.length,
    SLACK_WEBHOOK_URL_hasWhitespace: (process.env.SLACK_WEBHOOK_URL ?? "") !== u,
    channel: slackChannelLabel(),
  };
}
