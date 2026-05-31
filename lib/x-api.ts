import { TwitterApi, type TweetV2PostTweetResult } from "twitter-api-v2"

function getClient(): TwitterApi {
  const appKey = process.env.X_APP_KEY
  const appSecret = process.env.X_APP_SECRET
  const accessToken = process.env.X_ACCESS_TOKEN
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error("X_APP_KEY / X_APP_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET env vars not set")
  }
  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret })
}

export async function postTweet(text: string): Promise<TweetV2PostTweetResult> {
  return getClient().v2.tweet(text)
}

export async function postReply(text: string, replyToTweetId: string): Promise<TweetV2PostTweetResult> {
  return getClient().v2.reply(text, replyToTweetId)
}

/**
 * Pull mentions of the bot's handle. Returns up to `max` most recent first.
 * Caller filters by sinceId / since timestamp.
 */
export async function fetchMentions(sinceId?: string, max: number = 20) {
  const client = getClient()
  const me = await client.v2.me()
  const page = await client.v2.userMentionTimeline(me.data.id, {
    max_results: Math.max(5, Math.min(100, max)),
    "tweet.fields": ["created_at", "author_id", "conversation_id"],
    ...(sinceId ? { since_id: sinceId } : {}),
  })
  return page.data.data ?? []
}
