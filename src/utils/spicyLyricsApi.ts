import { SLObjPack } from './SLObjPack'

const PROXY_BASE = '/api'
const packer = new SLObjPack()

let cachedVersion: string | null = null

async function getVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion
  const res = await fetch(`${PROXY_BASE}/version`)
  if (!res.ok) throw new Error('Failed to fetch SpicyLyrics version')
  cachedVersion = (await res.text()).trim()
  console.log('[SpicyLyrics] version:', cachedVersion)
  return cachedVersion
}

export interface SpicyLyricsResult {
  Type: string
  Lines?: Array<{
    Text: string
    StartTime: number
    EndTime: number
    IsBackground?: boolean
    Syllabes?: Array<{ Text: string; StartTime: number; EndTime: number }>
  }>
  HasTransliterations?: boolean
}

export async function fetchSpicyLyrics(
  trackId: string,
  spotifyToken: string
): Promise<SpicyLyricsResult | null> {
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

  if (!res.ok) {
    console.warn('[SpicyLyrics] proxy returned', res.status)
    return null
  }

  const json = await res.json()
  console.log('[SpicyLyrics] raw response:', JSON.stringify(json).slice(0, 500))

  // Response shape: { queries: [{ operationId: "0", result: { data, httpStatus, format } }] }
  const queriesArr = json?.queries
  if (!Array.isArray(queriesArr) || queriesArr.length === 0) {
    console.warn('[SpicyLyrics] no queries array in response')
    return null
  }

  // Find the lyrics result — operationId should be "0"
  const lyricsJob = queriesArr.find((q: { operationId?: string }) => q.operationId === '0') ?? queriesArr[0]
  const result = lyricsJob?.result

  console.log('[SpicyLyrics] httpStatus:', result?.httpStatus, 'format:', result?.format)

  if (!result || result.httpStatus !== 200) {
    console.warn('[SpicyLyrics] non-200 status:', result?.httpStatus)
    return null
  }

  try {
    let lyrics: unknown
    if (result.format === 'json') {
      // Plain JSON — no unpacking needed
      lyrics = result.data
    } else {
      // SLObjPack compressed
      lyrics = packer.unpack(result.data)
    }
    console.log('[SpicyLyrics] unpacked Type:', (lyrics as SpicyLyricsResult)?.Type)
    return lyrics as unknown as SpicyLyricsResult
  } catch (e) {
    console.error('[SpicyLyrics] unpack failed:', e)
    return null
  }
}
