import { NextResponse } from "next/server"
import { loadAccounts, loadCharacter, loadPillars, loadToken, loadVoice } from "@/lib/config-loader"
import { appendLog, isDuplicateTweet, rememberTweet } from "@/lib/state"
import { generate } from "@/lib/raidx-ai"
import { postTweet } from "@/lib/x-api"

export const dynamic = "force-dynamic"

// Cron handler. Vercel calls this with GET. We always return 200 even on
// failure (per REBUILD-SPEC.md §374) so a transient outage doesn't poison
// the cron job's history view.
export async function GET() {
  try {
    const token = loadToken()
    const accounts = loadAccounts()
    const voice = loadVoice()
    const pillars = loadPillars()
    const character = loadCharacter()

    const pillar = pickPillar(pillars)
    const sys = buildSystemPrompt(character, voice, token, accounts.handle)
    const user = `Pillar: ${pillar.id}. Write one ${pillar.id} tweet in character. Examples: ${pillar.examples.join(" / ")}. Output the tweet only, max 240 chars, no quotes, no preamble.`

    const ai = await generate({ kind: "tweet", prompt: `${sys}\n\n---\n\n${user}` })
    const text = ai.text.trim().replace(/^["']|["']$/g, "").slice(0, 280)

    if (await isDuplicateTweet(text)) {
      await appendLog({ ts: new Date().toISOString(), level: "info", msg: `skipped duplicate: ${text.slice(0, 80)}` })
      return NextResponse.json({ skipped: "duplicate" })
    }

    await postTweet(text)
    await rememberTweet(text)
    await appendLog({ ts: new Date().toISOString(), level: "info", msg: `tweeted: ${text.slice(0, 80)}` })
    return NextResponse.json({ ok: true, text, billed_cents: ai.billed_cents })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown"
    await appendLog({ ts: new Date().toISOString(), level: "error", msg }).catch(() => {})
    return NextResponse.json({ ok: false, error: msg }, { status: 200 })
  }
}

function pickPillar(p: ReturnType<typeof loadPillars>): { id: string; examples: string[] } {
  const total = p.pillars.reduce((s, x) => s + x.weight, 0)
  let r = Math.random() * total
  for (const x of p.pillars) {
    r -= x.weight
    if (r <= 0) return { id: x.id, examples: x.examples }
  }
  return { id: p.pillars[0].id, examples: p.pillars[0].examples }
}

function buildSystemPrompt(character: string, voice: ReturnType<typeof loadVoice>, token: ReturnType<typeof loadToken>, handle: string): string {
  return [
    `You are @${handle}, the autonomous character bot for $${token.ticker} (${token.name}).`,
    "Write in this character at all times. Never break character to acknowledge you're an AI.",
    "",
    "## Character bible",
    character,
    "",
    "## Voice rules",
    `- Flavor vocab to lean on (use sparingly, never all at once): ${voice.flavorVocab.join(", ")}`,
    `- Sentence cap: ${voice.sentenceCap} chars`,
    `- Cadence: ${voice.cadence ?? "natural"}`,
    voice.allowEmoji ? "" : "- No emoji.",
    "- Reply temperature 1.0; tweet temperature 0.95. Vary phrasing. Avoid template-y output.",
  ].filter(Boolean).join("\n")
}
