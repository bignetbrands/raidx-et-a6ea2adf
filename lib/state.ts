import { Redis } from "@upstash/redis"

let redis: Redis | null = null

function getRedis(): Redis {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN env vars not set")
  redis = new Redis({ url, token })
  return redis
}

/**
 * Record a tweet so we don't dupe content (24h memory).
 */
export async function rememberTweet(text: string): Promise<void> {
  await getRedis().setex(`tweet:${hash(text)}`, 60 * 60 * 24, "1")
}

export async function isDuplicateTweet(text: string): Promise<boolean> {
  const v = await getRedis().get<string>(`tweet:${hash(text)}`)
  return v === "1"
}

/**
 * Track the timestamp of the last seen mention so /reply doesn't re-fetch the full timeline.
 */
export async function getLastMentionTime(): Promise<string | null> {
  return (await getRedis().get<string>("last_mention_ts")) ?? null
}

export async function setLastMentionTime(iso: string): Promise<void> {
  await getRedis().set("last_mention_ts", iso)
}

/**
 * Append to the bot's recent activity log (for the /admin status page).
 */
export interface LogEntry { ts: string; level: "info" | "error"; msg: string }

export async function appendLog(entry: LogEntry): Promise<void> {
  await getRedis().lpush("log", JSON.stringify(entry))
  await getRedis().ltrim("log", 0, 99)   // keep last 100
}

export async function readLog(): Promise<LogEntry[]> {
  const raw = await getRedis().lrange<string>("log", 0, 99)
  return raw.map((s) => JSON.parse(s) as LogEntry)
}

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h).toString(36)
}
