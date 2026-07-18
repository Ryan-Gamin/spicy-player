import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const rawAuth = req.headers['x-spotify-auth'] as string | undefined
  const spicyVersion = req.headers['x-spicy-version'] as string | undefined

  if (!rawAuth) return res.status(401).send('Missing Spotify auth')

  // Strip duplicate Bearer prefix if frontend already included it
  const spotifyAuth = rawAuth.startsWith('Bearer Bearer ')
    ? rawAuth.slice('Bearer '.length)
    : rawAuth

  console.log('[lyrics proxy] version:', spicyVersion, '| auth prefix:', spotifyAuth.slice(0, 20))

  try {
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
      console.error('[lyrics proxy] upstream error body:', errText.slice(0, 300))
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
