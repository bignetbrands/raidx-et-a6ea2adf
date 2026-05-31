/**
 * The bot doesn't hold AI provider keys. It calls back to raidx, which
 * dispatches to Claude/OpenAI/Groq and bills the deployment owner.
 * Authenticated by BOT_DEPLOY_SECRET (provisioned at deploy time, lives in
 * Vercel env on this bot's project).
 */

const RAIDX_BASE = (process.env.RAIDX_API_URL ?? "https://raidx.fun").replace(/\/$/, "")

export type AiKind = "tweet" | "reply"

interface AiRequest {
  kind: AiKind
  prompt: string
  model?: "fast" | "quality" | "free"
  // For replies: who/what we're replying to so the model has context.
  reply_to_text?: string
}

interface AiResponse {
  text: string
  model: string
  raw_cost_cents: number
  billed_cents: number
}

export async function generate(req: AiRequest): Promise<AiResponse> {
  const secret = process.env.BOT_DEPLOY_SECRET
  const deploymentId = process.env.RAIDX_DEPLOYMENT_ID
  if (!secret || !deploymentId) {
    throw new Error("BOT_DEPLOY_SECRET / RAIDX_DEPLOYMENT_ID env vars not set")
  }

  const r = await fetch(`${RAIDX_BASE}/api/internal/bot-ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "X-Deployment-Id": deploymentId,
    },
    body: JSON.stringify(req),
  })
  if (!r.ok) {
    const errBody = await r.text().catch(() => "")
    throw new Error(`raidx AI proxy ${r.status}: ${errBody.slice(0, 200)}`)
  }
  return (await r.json()) as AiResponse
}
