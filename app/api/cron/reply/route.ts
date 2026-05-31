import { NextResponse } from "next/server"
import { loadAccounts, loadCharacter, loadToken, loadVoice } from "@/lib/config-loader"
import { appendLog, getLastMentionTime, setLastMentionTime } from "@/lib/state"
import { generate } from "@/lib/raidx-ai"
import { fetchMentions, postReply } from "@/lib/x-api"

export const dynamic = "force-dynamic"

const MAX_REPLIES_PER_TICK = 5

export async function GET() {
  try {
    const token = loadToken()
    const accounts = loadAccounts()
    const voice = loadVoice()
    const character = loadCharacter()

    const lastTs = await getLastMentionTime()
    const mentions = await fetchMentions(undefined, 20)
    const fresh = mentions
      .filter((m) => !lastTs || (m.created_at && m.created_at > lastTs))
      .slice(0, MAX_REPLIES_PER_TICK)

    if (fresh.length === 0) {
      return NextResponse.json({ ok: true, replied: 0 })
    }

    const sys = buildSystemPrompt(character, voice, token, accounts.handle)
    let replied = 0

    for (const m of fresh) {
      try {
        const user = `A user just tweeted at @${accounts.handle}: "${m.text}". Write a single in-character reply, max 240 chars, no preamble, no quotes.`
        const ai = await generate({ kind: "reply", prompt: `${sys}\n\n---\n\n${user}`, reply_to_text: m.text })
        const text = ai.text.trim().replace(/^["']|["']$/g, "").slice(0, 280)
        await postReply(text, m.id)
        await appendLog({ ts: new Date().toISOString(), level: "info", msg: `replied to ${m.id}: ${text.slice(0, 80)}` })
        replied++
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "unknown"
        await appendLog({ ts: new Date().toISOString(), level: "error", msg: `reply failed for ${m.id}: ${errMsg}` })
      }
    }

    const newest = fresh[0]?.created_at
    if (newest) await setLastMentionTime(newest)

    return NextResponse.json({ ok: true, replied })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown"
    await appendLog({ ts: new Date().toISOString(), level: "error", msg }).catch(() => {})
    return NextResponse.json({ ok: false, error: msg }, { status: 200 })
  }
}

function buildSystemPrompt(character: string, voice: ReturnType<typeof loadVoice>, token: ReturnType<typeof loadToken>, handle: string): string {
  return [
    `You are @${handle}, the autonomous character bot for $${token.ticker} (${token.name}).`,
    "Stay in character. Reply as your character would — not as a customer-service bot.",
    "",
    "## Character bible",
    character,
    "",
    "## Voice rules",
    `- Flavor vocab to lean on (sparingly): ${voice.flavorVocab.join(", ")}`,
    `- Sentence cap: ${voice.sentenceCap} chars`,
    `- Cadence: ${voice.cadence ?? "natural"}`,
    voice.allowEmoji ? "" : "- No emoji.",
  ].filter(Boolean).join("\n")
}
