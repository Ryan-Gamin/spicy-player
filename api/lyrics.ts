import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  // The real SpicyLyrics client sends the Spotify token as 'SpicyLyrics-WebAuth'
  // We accept it from the frontend as 'x-spotify-auth' and forward it correctly
  const spotifyAuth = req.headers['x-spotify-auth'] as string | undefined
  const spicyVersion = req.headers['x-spicy-version'] as string | undefined

  if (!spotifyAuth) return res.status(401).send('Missing Spotify auth')

  try {
    const upstream = await fetch('https://api.spicylyrics.org/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SpicyLyrics-Version': spicyVersion ?? '',
        // This is the key header the API uses to authenticate and return synced lyrics
        'SpicyLyrics-WebAuth': spotifyAuth,
        'Origin': 'https://xpui.app.spotify.com',
        'Referer': 'https://xpui.app.spotify.com/',
      },
      body: JSON.stringify(req.body),
    })

    if (!upstream.ok) return res.status(upstream.status).send('Upstream error')

    const data = await upstream.json()
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).json(data)
  } catch (e) {
    console.error('[lyrics proxy] error:', e)
    res.status(500).send('Proxy error')
  }
}
