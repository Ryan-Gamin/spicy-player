import { SLObjPack } from './SLObjPack'

const API_HOST = 'https://api.spicylyrics.org'
const packer = new SLObjPack()

let cachedVersion: string | null = null

async function getVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion
  const res = await fetch(`${API_HOST}/version`)
  if (!res.ok) throw new Error('Failed to fetch SpicyLyrics version')
  cachedVersion = (await res.text()).trim()
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

  const res = await fetch(`${API_HOST}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'SpicyLyrics-Version': version,
      'SpicyLyrics-WebAuth': `Bearer ${spotifyToken}`,
    },
    body: JSON.stringify({
      queries: [
        {
          operation: 'lyrics',
          variables: {
            id: trackId,
            auth: 'SpicyLyrics-WebAuth',
          },
        },
      ],
      client: { version },
    }),
  })

  if (!res.ok) return null

  const json = await res.json()
  const queryResult = json?.queries?.[0]?.result
  if (!queryResult || queryResult.httpStatus !== 200) return null

  try {
    const unpacked = packer.unpack(queryResult.data) as unknown as SpicyLyricsResult
    return unpacked
  } catch {
    return null
  }
}
