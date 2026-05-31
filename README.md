# raidx-bot-template

Template repository that [raidx](https://raidx.fun) forks into each user's GitHub when they deploy a memecoin character bot.

You probably don't want to run this manually — it's designed to be deployed via raidx's "Deploy bot" flow, which sets the env vars + injects the per-project `config/<ticker>/` directory.

## How a deployed bot works

- `vercel.json` schedules two cron jobs:
  - `*/30 * * * *` → `/api/cron/tweet` — generates one in-character tweet per slot.
  - `*/10 * * * *` → `/api/cron/reply` — replies to new mentions since the last tick.
- Both crons read the character bible from `config/<ticker>/` (committed by raidx's deploy worker), call back to raidx at `/api/internal/bot-ai` for AI completions, and post via the X API v2.
- State (recent-tweet dedupe, last-seen-mention timestamp, log of recent actions) lives in Upstash Redis.
- The status page at `/` and `/api/admin/status` (gated by `BOT_DEPLOY_SECRET`) is for raidx's smoke test + the user's at-a-glance health check.

## Required env vars

raidx's deploy worker sets all of these for you on each deployed Vercel project. Listed here so you understand the contract:

| Var | What |
| --- | --- |
| `TICKER` | The project's ticker. Used to select the right `config/<ticker>/` directory. |
| `X_APP_KEY`, `X_APP_SECRET` | App credentials for the bot's X developer app. |
| `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET` | User-context tokens for the bot's X account. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Per-bot Redis namespace, provisioned by raidx. |
| `RAIDX_API_URL` | `https://raidx.fun` |
| `RAIDX_DEPLOYMENT_ID` | UUID of the row in raidx's `bot_deployments` table. Sent in `X-Deployment-Id` header on AI calls. |
| `BOT_DEPLOY_SECRET` | Bearer secret for the AI proxy + admin status endpoint. |
