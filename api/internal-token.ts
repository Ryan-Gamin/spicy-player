import type { VercelRequest, VercelResponse } from '@vercel/node'

let cachedToken: string | null = null
let cacheExpiry = 0

export async function getInternalToken(): Promise<string> {
  if (cachedToken && Date.now() < cacheExpiry) return cachedToken

  const spDc = process.env.SPOTIFY_SP_DC
  if (!spDc) throw new Error('SPOTIFY_SP_DC env var not set')

  const res = await fetch(
    'https://open.spotify.com/get_access_token?reason=transport&productType=web_player',
    {
      headers: {
        'Cookie': `sp_dc=${spDc}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    }
  )

  if (!res.ok) throw new Error(`Failed to get internal token: ${res.status}`)

  const data = await res.json() as { accessToken: string; accessTokenExpirationTimestampMs: number }
  if (!data.accessToken) throw new Error('No accessToken in response')

  cachedToken = `Bearer ${data.accessToken}`
  cacheExpiry = data.accessTokenExpirationTimestampMs - 30_000 // 30s buffer
  console.log('[internal-token] fetched new token, expires at', new Date(cacheExpiry).toISOString())
  return cachedToken
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const token = await getInternalToken()
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json({ token })
  } catch (e) {
    console.error('[internal-token] error:', e)
    res.status(500).json({ error: String(e) })
  }
}
