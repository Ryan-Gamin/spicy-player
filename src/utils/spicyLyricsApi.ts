import { SLObjPack } from './SLObjPack'
import type { LyricLine } from '../hooks/useLyrics'

const PROXY_BASE = '/api'
const packer = new SLObjPack()

let cachedVersion: string | null = null

async function getVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion
  const res = await fetch(`${PROXY_BASE}/version`)
  if (!res.ok) throw new Error('Failed to fetch SpicyLyrics version')
  cachedVersion = (await res.text()).trim()
  return cachedVersion
}

// Raw line as returned by API: either object form or legacy array form
type RawLine = {
  Text?: string
  StartTime?: number
  EndTime?: number
  IsBackground?: boolean
  Syllabes?: Array<{ Text: string; StartTime: number; EndTime: number }>
  Type?: string
} | unknown[]

function parseLines(data: unknown): LyricLine[] | null {
  console.log('[SpicyLyrics] raw data sample:', JSON.stringify(data)?.slice(0, 300))

  // Case 1: { Type, Lines: [...] }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const d = data as Record<string, unknown>
    if (Array.isArray(d.Lines)) {
      return (d.Lines as RawLine[]).map(parseSingleLine).filter(Boolean) as LyricLine[]
    }
  }

  // Case 2: flat array of lines [ { Text, StartTime, EndTime, ... }, ... ]
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && !Array.isArray(data[0])) {
    return (data as RawLine[]).map(parseSingleLine).filter(Boolean) as LyricLine[]
  }

  // Case 3: array of arrays [ ["Text", startMs, endMs], ... ]
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    return (data as unknown[][]).map((entry) => {
      const text = String(entry[0] ?? '')
      const startMs = Number(entry[1] ?? 0)
      const endMs = Number(entry[2] ?? 0)
      if (!text) return null
      return { text, startMs, endMs } as LyricLine
    }).filter(Boolean) as LyricLine[]
  }

  console.warn('[SpicyLyrics] unrecognised data shape')
  return null
}

function parseSingleLine(line: RawLine): LyricLine | null {
  if (Array.isArray(line)) {
    const text = String(line[0] ?? '')
    if (!text) return null
    return {
      text,
      startMs: Number(line[1] ?? 0),
      endMs: Number(line[2] ?? 0),
    }
  }
  const l = line as Record<string, unknown>
  const text = String(l.Text ?? '')
  if (!text) return null
  return {
    text,
    startMs: Number(l.StartTime ?? 0),
    endMs: Number(l.EndTime ?? 0),
    isBackground: Boolean(l.IsBackground),
    words: Array.isArray(l.Syllabes)
      ? (l.Syllabes as Array<Record<string, unknown>>).map((s) => ({
          text: String(s.Text ?? ''),
          startMs: Number(s.StartTime ?? 0),
          endMs: Number(s.EndTime ?? 0),
        }))
      : undefined,
  }
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
  if (!Array.isArray(queriesArr) || queriesArr.length === 0) return null

  const lyricsJob = queriesArr.find((q: { operationId?: string }) => q.operationId === '0') ?? queriesArr[0]
  const result = lyricsJob?.result
  if (!result || result.httpStatus !== 200) return null

  try {
    const raw = result.format === 'json' ? result.data : packer.unpack(result.data)
    return parseLines(raw)
  } catch (e) {
    console.error('[SpicyLyrics] parse failed:', e)
    return null
  }
}
