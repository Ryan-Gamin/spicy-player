import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const upstream = await fetch('https://api.spicylyrics.org/version', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
    })
    if (!upstream.ok) return res.status(upstream.status).send('Failed')
    const text = await upstream.text()
    // Tell Vercel edge and browsers not to cache this
    res.setHeader('Cache-Control', 'no-store')
    res.status(200).send(text.trim())
  } catch {
    res.status(500).send('Proxy error')
  }
}
