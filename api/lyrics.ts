import type { VercelRequest, VercelResponse } from '@vercel/node'

let cachedToken: string | null = null
let cacheExpiry = 0

async function getInternalToken(): Promise<string> {
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

  if (!res.ok) throw new Error(`open.spotify.com returned ${res.status}`)

  const data = await res.json() as { accessToken?: string; accessTokenExpirationTimestampMs?: number }
  if (!data.accessToken) throw new Error('No accessToken in open.spotify.com response')

  cachedToken = `Bearer ${data.accessToken}`
  cacheExpiry = (data.accessTokenExpirationTimestampMs ?? Date.now() + 3_600_000) - 30_000
  console.log('[lyrics proxy] fetched internal token, expires', new Date(cacheExpiry).toISOString())
  return cachedToken
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const spicyVersion = req.headers['x-spicy-version'] as string | undefined

  try {
    const spotifyAuth = await getInternalToken()
    console.log('[lyrics proxy] sending request, version:', spicyVersion)

    const upstream = await fetch('https://api.spicylyrics.org/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SpicyLyrics-Version': spicyVersion ?? '',
        'SpicyLyrics-WebAuth': spotifyAuth,
        'Origin': 'https://xpui.app.spotify.com',
        'Referer': 'https://xpui.app.spotify.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify(req.body),
    })

    console.log('[lyrics proxy] upstream status:', upstream.status)

    if (!upstream.ok) {
      const errText = await upstream.text()
      console.error('[lyrics proxy] upstream error:', errText.slice(0, 300))
      return res.status(upstream.status).send('Upstream error')
    }

    const data = await upstream.json()
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(data)
  } catch (e) {
    console.error('[lyrics proxy] error:', String(e))
    res.status(500).send(String(e))
  }
}
