import { loadAccounts, loadToken } from "@/lib/config-loader"

export const dynamic = "force-dynamic"

export default function HomePage() {
  let token: ReturnType<typeof loadToken> | null = null
  let accounts: ReturnType<typeof loadAccounts> | null = null
  try { token = loadToken(); accounts = loadAccounts() } catch { /* not yet configured */ }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "48px 24px" }}>
      <p style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, color: "var(--muted)", margin: 0 }}>
        raidx bot
      </p>
      <h1 style={{ fontSize: 36, margin: "8px 0 24px" }}>
        {token ? `$${token.ticker}` : "Unconfigured"}
      </h1>
      {token ? (
        <>
          <p style={{ color: "var(--muted)" }}>{token.name}</p>
          {accounts && (
            <p style={{ color: "var(--muted)", marginTop: 16 }}>
              X handle:{" "}
              <a href={`https://x.com/${accounts.handle}`} target="_blank" rel="noreferrer" className="mono">
                @{accounts.handle}
              </a>
            </p>
          )}
          <p style={{ color: "var(--muted)", marginTop: 32, fontSize: 14 }}>
            This is the bot&apos;s admin landing page. The bot tweets autonomously every 30 min and
            replies to mentions every 10 min. Status data is at <span className="mono">/api/admin/status</span> (requires
            the deploy secret).
          </p>
        </>
      ) : (
        <p style={{ color: "var(--muted)" }}>
          No <span className="mono">config/&lt;ticker&gt;/</span> directory found. This usually means the
          deploy worker didn&apos;t finish injecting config. Check the raidx deploy logs.
        </p>
      )}
    </main>
  )
}
