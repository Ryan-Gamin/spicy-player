import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const upstream = await fetch('https://api.spicylyrics.org/version')
    if (!upstream.ok) return res.status(upstream.status).send('Failed')
    const text = await upstream.text()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).send(text)
  } catch {
    res.status(500).send('Proxy error')
  }
}
