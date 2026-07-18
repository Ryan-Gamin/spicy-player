import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getInternalToken } from './internal-token'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const spicyVersion = req.headers['x-spicy-version'] as string | undefined

  try {
    // Use the internal Spotify token (from sp_dc cookie) — this is what SpicyLyrics needs
    const spotifyAuth = await getInternalToken()
    console.log('[lyrics proxy] using internal token, version:', spicyVersion)

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
    console.error('[lyrics proxy] error:', e)
    res.status(500).send('Proxy error')
  }
}
