import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const { body, headers } = req
  const spotifyAuth = headers['x-spotify-auth']
  const clientVersion = headers['x-spicy-version']

  if (!spotifyAuth || !clientVersion) {
    return res.status(400).send('Missing required headers')
  }

  try {
    const upstream = await fetch('https://api.spicylyrics.org/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'SpicyLyrics-Version': clientVersion as string,
        'SpicyLyrics-WebAuth': spotifyAuth as string,
        // Spoof the origin the API expects
        'Origin': 'https://xpui.app.spotify.com',
        'Referer': 'https://xpui.app.spotify.com/',
      },
      body: JSON.stringify(body),
    })

    const data = await upstream.json()
    res.status(upstream.status).json(data)
  } catch {
    res.status(500).json({ error: 'Proxy error' })
  }
}
