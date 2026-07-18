import { SLObjPack } from './SLObjPack'
import type { LyricLine } from '../hooks/useLyrics'

const PROXY_BASE = '/api'
const packer = new SLObjPack()

async function getVersion(): Promise<string> {
  const res = await fetch(`${PROXY_BASE}/version?t=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch version')
  const text = (await res.text()).trim()
  if (!text) throw new Error('Empty version')
  return text
}

export async function fetchSpicyLyrics(
  trackId: string,
  spotifyToken: string
): Promise<LyricLine[] | null> {
  const version = await getVersion()

  const res = await fetch(`${PROXY_BASE}/lyrics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-spotify-auth': `Bearer ${spotifyToken}`,
      'x-spicy-version': version,
    },
    body: JSON.stringify({
      queries: [{ operation: 'lyrics', variables: { id: trackId, auth: 'SpicyLyrics-WebAuth' } }],
      client: { version },
    }),
  })

  if (!res.ok) return null

  const json = await res.json()
  const queriesArr = json?.queries
  if (!Array.isArray(queriesArr)) return null

  const lyricsJob = queriesArr.find((q: { operationId?: string }) => q.operationId === '0') ?? queriesArr[1]
  const result = lyricsJob?.result
  if (!result || result.httpStatus !== 200) return null

  try {
    const unpacked = packer.unpack(result.data)
    // Log the FULL unpacked object so we can see every key and nested structure
    console.log('[SpicyLyrics] FULL unpacked:', JSON.stringify(unpacked, null, 2).slice(0, 2000))
    return null // temporarily return null while debugging
  } catch (e) {
    console.error('[SpicyLyrics] unpack failed:', e)
    return null
  }
}
