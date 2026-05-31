import { NextResponse } from "next/server"
import { loadAccounts, loadToken } from "@/lib/config-loader"
import { readLog } from "@/lib/state"

export const dynamic = "force-dynamic"

/**
 * Read-only status endpoint for raidx's smoke test + the bot's /admin UI.
 * Gated by BOT_DEPLOY_SECRET so randos can't read the activity log.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? ""
  const secret = process.env.BOT_DEPLOY_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const token = loadToken()
  const accounts = loadAccounts()
  const log = await readLog().catch(() => [])
  return NextResponse.json({
    ok: true,
    ticker: token.ticker,
    name: token.name,
    handle: accounts.handle,
    log,
  })
}
