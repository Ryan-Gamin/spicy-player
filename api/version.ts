import type { VercelRequest, VercelResponse } from '@vercel/node'

const VERSION_HOSTS = [
  'https://api.spicylyrics.org/version',
  'https://public.storage.spicylyrics.org/version',
]

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  for (const url of VERSION_HOSTS) {
    try {
      const upstream = await fetch(url, { cache: 'no-store' })
      if (!upstream.ok) continue
      const text = (await upstream.text()).trim()
      if (!text) continue
      console.log(`[version proxy] got version "${text}" from ${url}`)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).send(text)
    } catch (e) {
      console.warn(`[version proxy] failed to fetch ${url}:`, e)
    }
  }
  // Last resort: return the latest known good version from the spicy-lyrics repo
  console.warn('[version proxy] all hosts failed, using fallback version')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).send('1.1.0')
}
