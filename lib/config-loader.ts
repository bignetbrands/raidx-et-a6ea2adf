import fs from "node:fs"
import path from "node:path"

/**
 * The deploy worker writes config files into /config/${TICKER_LOWER}/.
 * TICKER comes in via env at deploy time. All loaders return raw parsed JSON,
 * the routes destructure what they need.
 */
function ticker(): string {
  const t = process.env.TICKER
  if (!t) throw new Error("TICKER env var not set")
  return t.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function readFile(name: string): string {
  const p = path.join(process.cwd(), "config", ticker(), name)
  return fs.readFileSync(p, "utf-8")
}

export interface TokenJson { ticker: string; name: string; contract: string | null; blockchain: string; decimals: number }
export interface AccountsJson { handle: string; familyAccounts: string[]; replyToFamilyEachCycle: boolean }
export interface VoiceJson { flavorVocab: string[]; primaryTerminalEmoticon: string | null; sentenceCap: number; allowEmoji: boolean; cadence: string | null }
export interface PillarsJson {
  schedule: { tweetsPerDay: number; jitterMinutes: number; slots: string[] }
  pillars: Array<{ id: string; priority: "high" | "normal"; weight: number; examples: string[] }>
}

export const loadToken    = (): TokenJson    => JSON.parse(readFile("token.json"))
export const loadAccounts = (): AccountsJson => JSON.parse(readFile("accounts.json"))
export const loadVoice    = (): VoiceJson    => JSON.parse(readFile("voice.json"))
export const loadPillars  = (): PillarsJson  => JSON.parse(readFile("pillars.json"))
export const loadCharacter = (): string      => readFile("character.md")
