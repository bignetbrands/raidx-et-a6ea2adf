import type { Metadata, Viewport } from "next"
import { loadToken } from "@/lib/config-loader"
import "./globals.css"

function safeMeta() {
  try {
    const t = loadToken()
    return { title: `$${t.ticker} — bot`, description: `Autonomous character bot for $${t.ticker} (${t.name}).` }
  } catch {
    return { title: "raidx bot", description: "Autonomous character bot" }
  }
}

export const metadata: Metadata = safeMeta()
export const viewport: Viewport = { themeColor: "#0a0a0a" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
